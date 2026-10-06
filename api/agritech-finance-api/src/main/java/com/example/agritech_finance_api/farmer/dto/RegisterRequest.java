package com.example.agritech_finance_api.farmer.dto;

public class RegisterRequest {
    private String name;
    private String location;
<<<<<<< HEAD
=======
    private String province;
    private String country;
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
    private String contact;
    private String password;

    public RegisterRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

<<<<<<< HEAD
=======
    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
