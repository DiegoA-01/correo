package com.correo.backend.email;

import com.correo.backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/** Llama al Cloudflare Worker, que es quien envía el correo con SendGrid. */
@Component
public class WorkerClient {

    private static final Logger log = LoggerFactory.getLogger(WorkerClient.class);

    private final RestClient restClient;
    private final AppProperties props;

    public WorkerClient(AppProperties props) {
        this.props = props;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(15_000);

        this.restClient = RestClient.builder()
                .baseUrl(props.workerUrl())
                .requestFactory(factory)
                .build();
    }

    /** Devuelve el id del correo en SendGrid. Lanza EmailSendException si el Worker falla. */
    public String send(EmailRequest request) {
        if (isBlank(props.workerUrl()) || isBlank(props.workerInternalKey())) {
            throw new EmailSendException("El backend no está configurado (falta WORKER_URL o WORKER_INTERNAL_KEY)");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Internal-Key", props.workerInternalKey())
                    .body(Map.of(
                            "to", request.to(),
                            "subject", request.subject(),
                            "message", request.message()))
                    .retrieve()
                    .body(Map.class);

            return body == null ? null : (String) body.get("id");
        } catch (RestClientException e) {
            log.error("Error llamando al Worker: {}", e.getMessage());
            throw new EmailSendException("No se pudo enviar el correo");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
