package com.example.agritech_finance_api.finance;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity
@Table(name = "expenses")
public class Expense {

   @Id
@GeneratedValue(strategy = GenerationType.UUID)
@Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
private String id;

    @Column(name = "farmer_id", nullable = false)
    private String farmerId;

    private String item;
    private String category;
    private BigDecimal amount;
    private LocalDate date = LocalDate.now();

    // Getters and setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFarmerId() { return farmerId; }
    public void setFarmerId(String farmerId) { this.farmerId = farmerId; }

    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}
