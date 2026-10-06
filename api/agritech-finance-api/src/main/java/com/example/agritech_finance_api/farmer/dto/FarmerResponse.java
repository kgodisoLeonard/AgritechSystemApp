package com.example.agritech_finance_api.farmer.dto;

import com.example.agritech_finance_api.farmer.Farmer;

import java.time.LocalDateTime;

public class FarmerResponse {
    private String id;
    private String name;
    private String location;
<<<<<<< HEAD
=======
    private String province;
    private String country;
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
    private String contact;
    private LocalDateTime createdAt;

    public FarmerResponse(Farmer farmer) {
        this.id = farmer.getId();
        this.name = farmer.getName();
        this.location = farmer.getLocation();
<<<<<<< HEAD
=======
        this.province = farmer.getProvince();
        this.country = farmer.getCountry();
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
        this.contact = farmer.getContact();
        this.createdAt = farmer.getCreatedAt();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getLocation() { return location; }
<<<<<<< HEAD
=======
    public String getProvince() { return province; }
    public String getCountry() { return country; }
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
    public String getContact() { return contact; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
