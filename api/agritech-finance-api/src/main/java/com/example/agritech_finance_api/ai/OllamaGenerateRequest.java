package com.example.agritech_finance_api.ai;

record OllamaGenerateRequest(String model, String prompt, boolean stream, String system,
        java.util.Map<String, Object> options) {
}
