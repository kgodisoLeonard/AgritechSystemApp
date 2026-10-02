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

    public ChatResponse chat(String prompt, String context) {
        try {
            String finalPrompt = buildPrompt(prompt, context);
            OllamaGenerateResponse result = ollama.post()
                    .uri("/api/generate")
                    .body(new OllamaGenerateRequest(model, finalPrompt, false))
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

    // Grounds the model's answer in the farmer's own real numbers (when the
    // frontend supplies them) instead of only giving generic advice, without
    // requiring any extra round trip to Ollama.
    private String buildPrompt(String prompt, String context) {
        if (context == null || context.isBlank()) {
            return "You are Lema, a friendly assistant for small-scale South African farmers. "
                    + "Answer concisely and practically.\n\nQuestion: " + prompt;
        }
        return "You are Lema, a friendly assistant for small-scale South African farmers. "
                + "Use the farmer's own numbers below to tailor concrete, practical advice. "
                + "Answer concisely.\n\nFarmer's numbers: " + context + "\n\nQuestion: " + prompt;
    }
}
