package com.example.agritech_finance_api.finance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/finance/income")
public class IncomeController {

    @Autowired
    private IncomeRepository incomeRepository;

    // Get all income records
    @GetMapping
    public List<Income> getAllIncome() {
        return incomeRepository.findAll();
    }

    // Get income by ID
    @GetMapping("/{id}")
    public Optional<Income> getIncomeById(@PathVariable Long id) {
        return incomeRepository.findById(id);
    }

    // Create a new income record
    @PostMapping
    public Income createIncome(@RequestBody Income income) {
        return incomeRepository.save(income);
    }

    // Delete an income record
    @DeleteMapping("/{id}")
    public void deleteIncome(@PathVariable Long id) {
        incomeRepository.deleteById(id);
    }

    // Update an existing income record
    @PutMapping("/{id}")
    public Income updateIncome(@PathVariable Long id, @RequestBody Income incomeDetails) {
        return incomeRepository.findById(id)
                .map(income -> {
                    income.setSource(incomeDetails.getSource());
                    income.setAmount(incomeDetails.getAmount());
                    income.setDate(incomeDetails.getDate());
                    return incomeRepository.save(income);
                })
                .orElseGet(() -> {
                    incomeDetails.setId(id);
                    return incomeRepository.save(incomeDetails);
                });
    }
}