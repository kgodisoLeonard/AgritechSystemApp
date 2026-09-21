package com.agritech.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class ChatController {
    private final RestTemplate restTemplate;
    private final String endpoint;
    private final String apiKey;
    private final String deployment;

    public ChatController(
            RestTemplate restTemplate,
            @Value("${azure.openai.endpoint:}") String endpoint,
            @Value("${azure.openai.api-key:}") String apiKey,
            @Value("${azure.openai.deployment:}") String deployment) {
        this.restTemplate = restTemplate;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.deployment = deployment;
    }

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        boolean configured = !endpoint.isEmpty() && !apiKey.isEmpty() && !deployment.isEmpty();
        return ResponseEntity.ok(new HealthResponse("ok", configured));
    }

    @PostMapping("/chat")
    public ResponseEntity<Object> chat(@RequestBody ChatRequest request) {
        if (request == null || request.getPrompt() == null || request.getPrompt().trim().isEmpty()) {
            return ResponseEntity.badRequest().body((Object) Collections.singletonMap("message", "prompt is required"));
        }

        if (endpoint.isEmpty() || apiKey.isEmpty() || deployment.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body((Object) Collections.singletonMap("message", "Azure OpenAI is not configured"));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", deployment);
        Map<String, String> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", request.getPrompt().trim());
        body.put("messages", Collections.singletonList(message));
        body.put("max_tokens", 800);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("api-key", apiKey);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    endpoint, new HttpEntity<>(body, headers), Map.class);
            Map responseBody = response.getBody();
            String content = extractContent(responseBody);
            return ResponseEntity.ok(new ChatResponse(content));
        } catch (RestClientException error) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Collections.singletonMap("message", "Azure OpenAI request failed"));
        }
    }

    private static String extractContent(Map response) {
        if (response == null || !(response.get("choices") instanceof java.util.List)) {
            return "";
        }
        java.util.List choices = (java.util.List) response.get("choices");
        if (choices.isEmpty() || !(choices.get(0) instanceof Map)) {
            return "";
        }
        Map choice = (Map) choices.get(0);
        Map message = choice.get("message") instanceof Map ? (Map) choice.get("message") : null;
        Object content = message == null ? null : message.get("content");
        return content == null ? "" : content.toString();
    }

    public static class HealthResponse {
        private final String status;
        private final boolean azureOpenAiConfigured;

        public HealthResponse(String status, boolean azureOpenAiConfigured) {
            this.status = status;
            this.azureOpenAiConfigured = azureOpenAiConfigured;
        }

        public String getStatus() {
            return status;
        }

        public boolean isAzureOpenAiConfigured() {
            return azureOpenAiConfigured;
        }
    }
}
