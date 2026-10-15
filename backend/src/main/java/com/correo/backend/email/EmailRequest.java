package com.correo.backend.email;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo que envía el frontend a POST /api/email. */
public record EmailRequest(
        @NotBlank(message = "El correo de destino es obligatorio")
        @Email(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Correo de destino inválido")
        String to,

        @NotBlank(message = "El asunto es obligatorio")
        @Size(max = 200, message = "El asunto admite máximo 200 caracteres")
        String subject,

        @NotBlank(message = "El mensaje es obligatorio")
        @Size(max = 5000, message = "El mensaje admite máximo 5000 caracteres")
        String message
) {
}
