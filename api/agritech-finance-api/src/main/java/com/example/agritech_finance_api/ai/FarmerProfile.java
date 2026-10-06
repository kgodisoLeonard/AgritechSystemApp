package com.example.agritech_finance_api.ai;

import java.math.BigDecimal;
import java.util.Set;

public record FarmerProfile(
        String id,
        String name,
        String location,
        BigDecimal totalExpense,
        long expenseCount,
        long orderCount,
        BigDecimal orderSpend,
        long distinctItems,
        Set<String> tokens) {
}
