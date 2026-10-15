package com.correo.backend.email;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class EmailController {

    private final WorkerClient workerClient;

    public EmailController(WorkerClient workerClient) {
        this.workerClient = workerClient;
    }

    /** Recibe el formulario del frontend y lo pasa al Worker. */
    @PostMapping("/email")
    public Map<String, Object> send(@Valid @RequestBody EmailRequest request) {
        String id = workerClient.send(request);
        return id == null ? Map.of("ok", true) : Map.of("ok", true, "id", id);
    }

    /** Health check para Render (y para "despertar" el servicio en el plan gratis). */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
