package com.example.agritech_finance_api.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
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
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama is unavailable", exception);
        }
    }
}
