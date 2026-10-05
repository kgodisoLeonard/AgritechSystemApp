package com.example.agritech_finance_api.farmer.dto;

import com.example.agritech_finance_api.farmer.Farmer;

import java.time.LocalDateTime;

public class FarmerResponse {
    private String id;
    private String name;
    private String location;
    private String province;
    private String country;
    private String contact;
    private LocalDateTime createdAt;

    public FarmerResponse(Farmer farmer) {
        this.id = farmer.getId();
        this.name = farmer.getName();
        this.location = farmer.getLocation();
        this.province = farmer.getProvince();
        this.country = farmer.getCountry();
        this.contact = farmer.getContact();
        this.createdAt = farmer.getCreatedAt();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getLocation() { return location; }
    public String getProvince() { return province; }
    public String getCountry() { return country; }
    public String getContact() { return contact; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
