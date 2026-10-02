package com.example.agritech_finance_api.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatService {
    private final RestClient ollama;
    private final String model;

    public ChatService(RestClient.Builder builder, @Value("${ai.base-url}") String baseUrl,
            @Value("${ai.model}") String model) {
        this.ollama = builder.baseUrl(baseUrl).build();
        this.model = model;
    }

    public ChatResponse chat(String prompt) {
        RestClientException lastException = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                return generate(prompt);
            } catch (RestClientResponseException exception) {
                if (isMissingModel(exception)) {
                    try {
                        pullModel();
                        return generate(prompt);
                    } catch (RestClientException pullException) {
                        lastException = pullException;
                        pauseBeforeRetry(attempt);
                        continue;
                    }
                }
                lastException = exception;
            } catch (RestClientException exception) {
                lastException = exception;
                pauseBeforeRetry(attempt);
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama is unavailable", lastException);
    }

    private ChatResponse generate(String prompt) {
        try {
            OllamaGenerateResponse result = ollama.post()
                    .uri("/api/generate")
                    .body(new OllamaGenerateRequest(model, prompt, false))
                    .retrieve()
                    .body(OllamaGenerateResponse.class);
            if (result == null || result.response() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an empty response");
            }
            return new ChatResponse(result.model(), result.response());
        } catch (ResponseStatusException exception) {
            throw exception;
        }
    }

    private void pullModel() {
        ollama.post()
                .uri("/api/pull")
                .body(new OllamaPullRequest(model, false))
                .retrieve()
                .toBodilessEntity();
    }

    private boolean isMissingModel(RestClientResponseException exception) {
        String body = exception.getResponseBodyAsString().toLowerCase();
        return exception.getStatusCode().value() == 404
                || body.contains("model")
                && (body.contains("not found") || body.contains("pull"));
    }

    private void pauseBeforeRetry(int attempt) {
        if (attempt >= 3) {
            return;
        }
        try {
            Thread.sleep(1000L * attempt);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
