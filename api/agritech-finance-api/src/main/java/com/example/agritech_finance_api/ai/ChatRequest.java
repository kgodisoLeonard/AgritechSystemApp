package com.example.agritech_finance_api.ai;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(@NotBlank String prompt) {
}
