package com.example.agritech_finance_api.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ChatServiceTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void sendsThePromptToOllama() throws Exception {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ChatService service = new ChatService(builder, "http://ollama.test", "qwen2.5:0.5b");

        String expectedPrompt = "You are Lema, a friendly assistant for small-scale South African farmers. "
                + "Answer concisely and practically.\n\nQuestion: Explain crop rotation";
        String expectedBody = MAPPER.writeValueAsString(
                new OllamaGenerateRequest("qwen2.5:0.5b", expectedPrompt, false));

        server.expect(requestTo("http://ollama.test/api/generate"))
                .andExpect(method(POST))
                .andExpect(content().json(expectedBody))
                .andRespond(withSuccess("""
                        {"model":"qwen2.5:0.5b","response":"Crop rotation alternates crops."}
                        """, MediaType.APPLICATION_JSON));

        ChatResponse response = service.chat("Explain crop rotation", null);

        assertThat(response.response()).isEqualTo("Crop rotation alternates crops.");
        server.verify();
    }

    @Test
    void includesFarmContextWhenProvided() throws Exception {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ChatService service = new ChatService(builder, "http://ollama.test", "qwen2.5:0.5b");

        String expectedPrompt = "You are Lema, a friendly assistant for small-scale South African farmers. "
                + "Use the farmer's own numbers below to tailor concrete, practical advice. Answer concisely.\n\n"
                + "Farmer's numbers: Spent R2200 on fertilizer this month.\n\nQuestion: How can I cut costs?";
        String expectedBody = MAPPER.writeValueAsString(
                new OllamaGenerateRequest("qwen2.5:0.5b", expectedPrompt, false));

        server.expect(requestTo("http://ollama.test/api/generate"))
                .andExpect(method(POST))
                .andExpect(content().json(expectedBody))
                .andRespond(withSuccess("""
                        {"model":"qwen2.5:0.5b","response":"Buy fertiliser as a group to save."}
                        """, MediaType.APPLICATION_JSON));

        ChatResponse response = service.chat("How can I cut costs?", "Spent R2200 on fertilizer this month.");

        assertThat(response.response()).isEqualTo("Buy fertiliser as a group to save.");
        server.verify();
    }
}
