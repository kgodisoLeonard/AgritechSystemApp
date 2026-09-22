package com.example.agritech_finance_api.finance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/finance/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepository;

    // POST /finance/expenses — farmer logs a new expense
    @PostMapping
    public Expense logExpense(@RequestBody Expense expense) {
        return expenseRepository.save(expense);
    }

    // GET /finance/expenses?farmerId=<uuid> — farmer views their expenses
    @GetMapping
    public List<Expense> getExpenses(@RequestParam String farmerId) {
        return expenseRepository.findByFarmerId(farmerId);
    }
}
