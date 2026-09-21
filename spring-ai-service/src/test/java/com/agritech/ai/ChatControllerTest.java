package com.agritech.ai;

import org.junit.jupiter.api.Test;
class ChatControllerTest {
    private final ChatController controller = new ChatController(
            new org.springframework.web.client.RestTemplate(), "", "", "");

    @Test
    void healthReportsAzureAsNotConfigured() throws Exception {
        ChatController.HealthResponse response = controller.health().getBody();

        org.junit.jupiter.api.Assertions.assertNotNull(response);
        org.junit.jupiter.api.Assertions.assertEquals("ok", response.getStatus());
        org.junit.jupiter.api.Assertions.assertFalse(response.isAzureOpenAiConfigured());
    }

    @Test
    void emptyPromptIsRejected() throws Exception {
        ChatRequest request = new ChatRequest();
        request.setPrompt("");

        org.springframework.http.ResponseEntity<Object> response = controller.chat(request);

        org.junit.jupiter.api.Assertions.assertEquals(400, response.getStatusCodeValue());
        org.junit.jupiter.api.Assertions.assertTrue(response.getBody().toString().contains("prompt is required"));
    }
}
