package com.correo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración leída de application.properties / variables de entorno.
 *
 * @param workerUrl         URL del Cloudflare Worker (WORKER_URL)
 * @param workerInternalKey clave compartida con el Worker (WORKER_INTERNAL_KEY)
 * @param allowedOrigin     URL del frontend permitida por CORS (ALLOWED_ORIGIN)
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(String workerUrl, String workerInternalKey, String allowedOrigin) {
}
