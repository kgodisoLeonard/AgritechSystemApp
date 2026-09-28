package com.example.agritech_finance_api.finance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

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
    public List<Expense> getExpenses(@RequestParam(required = false) String farmerId) {
        if (farmerId != null) {
            return expenseRepository.findByFarmerId(farmerId);
        }
        return expenseRepository.findAll();
    }

    // Get expense by ID
    @GetMapping("/{id}")
    public Optional<Expense> getExpenseById(@PathVariable Long id) {
        return expenseRepository.findById(id);
    }

    // Update an existing expense record
    @PutMapping("/{id}")
    public Expense updateExpense(@PathVariable Long id, @RequestBody Expense expenseDetails) {
        return expenseRepository.findById(id)
                .map(expense -> {
                    expense.setCategory(expenseDetails.getCategory());
                    expense.setAmount(expenseDetails.getAmount());
                    expense.setDate(expenseDetails.getDate());
                    return expenseRepository.save(expense);
                })
                .orElseGet(() -> {
                    expenseDetails.setId(id);
                    return expenseRepository.save(expenseDetails);
                });
    }

    // Delete an expense record
    @DeleteMapping("/{id}")
    public void deleteExpense(@PathVariable Long id) {
        expenseRepository.deleteById(id);
    }
}