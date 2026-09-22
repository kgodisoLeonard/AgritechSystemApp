package com.example.agritech_finance_api.finance;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, String> {
    List<Expense> findByFarmerId(String farmerId);
}
