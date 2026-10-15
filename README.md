# Sistema de Envío de Correos

React (Netlify) → Spring Boot (Render) → Cloudflare Worker (serverless) → Resend → Destinatario.
Sin base de datos.

```
correo/
├── frontend/   React + Vite, se despliega en Netlify
├── backend/    Spring Boot 4 (Java 21), se despliega en Render con Docker
├── worker/     Cloudflare Worker, envía el correo con Resend
├── render.yaml blueprint opcional para Render
└── sistema-envio-email.drawio   diagrama de arquitectura
```

## Cómo funciona

1. React envía `POST /api/email` a Spring Boot con `{ to, subject, message }`.
2. Spring Boot valida los datos y llama al Worker con el header `X-Internal-Key`.
3. El Worker revisa esa clave (si no coincide responde `401`) y llama a Resend.
4. Resend entrega el correo.

Secretos y dónde viven:

| Secreto | Dónde | Para qué |
|---------|-------|----------|
| `RESEND_API_KEY` | Cloudflare (Worker) | Enviar correos con Resend |
| `INTERNAL_API_KEY` | Cloudflare (Worker) | Clave que el Worker exige |
| `WORKER_INTERNAL_KEY` | Render (Spring Boot) | La **misma** clave, que Spring envía al Worker |

Ningún secreto va en el frontend.

## Orden de despliegue

Primero el Worker, luego Spring Boot, luego el frontend, y al final cierras el CORS.

### 1. Clave interna

Genera una clave larga y aleatoria. La usarás en Cloudflare y en Render:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Worker en Cloudflare

Desde el panel (*Workers & Pages → weathered-fog-b4e0*):

1. **Edit code**: borra todo, pega el contenido de `worker/src/index.js` y pulsa **Deploy**.
2. **Settings → Variables and Secrets**, agrega:
   - Secret `RESEND_API_KEY`: tu key de Resend (`re_...`)
   - Secret `INTERNAL_API_KEY`: la clave del paso 1
   - Text `FROM_EMAIL`: `onboarding@resend.dev` (o un remitente de tu dominio verificado)
   - Text `FROM_NAME`: `Sistema de Correos`
3. Copia la URL del Worker (pestaña **Domains**, `workers.dev`).

O con la terminal: `cd worker`, `npx wrangler secret put RESEND_API_KEY`,
`npx wrangler secret put INTERNAL_API_KEY`, `npm run deploy`.
No mezcles los dos métodos: `wrangler deploy` reemplaza las variables de texto del panel.

### 3. Spring Boot en Render

1. Sube el repo a GitHub.
2. En Render: **New → Web Service** y elige el repo.
3. Configura:
   - **Root Directory**: `backend`
   - **Runtime / Language**: `Docker`
   - **Instance type**: Free
   - **Health Check Path** (en *Advanced*): `/api/health`
4. **Environment Variables**:
   - `WORKER_URL`: URL del Worker del paso 2
   - `WORKER_INTERNAL_KEY`: la clave del paso 1
   - `ALLOWED_ORIGIN`: por ahora `http://localhost:5173` (lo cambias en el paso 5)
5. **Create Web Service**. El primer build tarda varios minutos.
6. Prueba: abre `https://TU-SERVICIO.onrender.com/api/health`, debe responder `{"status":"ok"}`.

(Alternativa: **New → Blueprint** usa `render.yaml` y te pide solo las tres variables.)

En el plan gratis, Render duerme el servicio tras ~15 min sin uso. La primera petición
después tarda ~50 s o más. El frontend lo "despierta" apenas carga la página.

### 4. Frontend en Netlify

1. **Add new site → Import from Git**, mismo repo.
2. **Base directory**: `frontend` (el build sale de `netlify.toml`).
3. **Environment variables**: `VITE_API_URL` = `https://TU-SERVICIO.onrender.com` (sin `/` al final).
4. Despliega y copia la URL del sitio, por ejemplo `https://tu-sitio.netlify.app`.

### 5. Cerrar el CORS

En Render, cambia `ALLOWED_ORIGIN` a la URL de Netlify (sin `/` al final) y guarda.
Render redespliega solo. Para permitir varias URLs, sepáralas con coma.

### 6. Probar

Abre tu sitio de Netlify y envía un correo. Con `onboarding@resend.dev`, Resend solo entrega
al correo de tu cuenta de Resend. Para enviar a cualquiera, verifica un dominio en
*Resend → Domains* y cambia `FROM_EMAIL`.

## Desarrollo local

Tres terminales:

```bash
# 1. Worker (http://localhost:8787)
cd worker
npm install
cp .dev.vars.example .dev.vars   # pon RESEND_API_KEY e INTERNAL_API_KEY
npm run dev
```

```bash
# 2. Spring Boot (http://localhost:8080)
cd backend
WORKER_URL=http://localhost:8787 WORKER_INTERNAL_KEY=la-misma-clave mvn spring-boot:run
```

```bash
# 3. Frontend (http://localhost:5173)
cd frontend
npm install
cp .env.example .env             # VITE_API_URL=http://localhost:8080
npm run dev
```

## API

### Spring Boot: `POST /api/email`

```json
{ "to": "destinatario@correo.com", "subject": "Asunto", "message": "Texto" }
```

| Respuesta | Significado |
|-----------|-------------|
| `200 {"ok":true,"id":"..."}` | Correo aceptado por Resend |
| `400 {"error":"..."}` | Datos inválidos o JSON mal formado |
| `502 {"error":"..."}` | Falló el Worker o Resend (revisa logs de Render y Cloudflare) |

`GET /api/health` responde `{"status":"ok"}`.

### Worker: `POST /`

Mismo JSON, más el header `X-Internal-Key`. Responde `401` sin clave correcta,
`400` con datos inválidos, `500` si falta configuración y `502` si Resend falla.

## Seguridad

El Worker ya no es público: solo Spring Boot puede usarlo. Pero `POST /api/email` sí es público
y deja elegir el destinatario, así que alguien podría usarlo para enviar spam. Antes de usarlo
en serio, agrega Cloudflare Turnstile (captcha) en el formulario, un límite de envíos en
Spring Boot o un destinatario fijo.
