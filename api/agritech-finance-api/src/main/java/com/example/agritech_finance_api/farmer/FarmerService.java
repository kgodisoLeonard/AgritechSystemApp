package com.example.agritech_finance_api.farmer;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class FarmerService {

    private final FarmerRepository farmerRepository;
    private final PasswordEncoder passwordEncoder;

    public FarmerService(FarmerRepository farmerRepository, PasswordEncoder passwordEncoder) {
        this.farmerRepository = farmerRepository;
        this.passwordEncoder = passwordEncoder;
    }

<<<<<<< HEAD
    public Farmer register(String name, String location, String contact, String password) {
=======
    public Farmer register(String name, String location, String province, String country, String contact, String password) {
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
        if (farmerRepository.findByContact(contact).isPresent()) {
            throw new ResponseStatusException(BAD_REQUEST, "Contact already registered");
        }

        Farmer farmer = new Farmer();
        farmer.setName(name);
        farmer.setLocation(location);
<<<<<<< HEAD
=======
        farmer.setProvince(province);
        farmer.setCountry(country);
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
        farmer.setContact(contact);
        farmer.setPasswordHash(passwordEncoder.encode(password));

        return farmerRepository.save(farmer);
    }

    public Farmer login(String contact, String password) {
        Farmer farmer = farmerRepository.findByContact(contact)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid contact or password"));

        if (!passwordEncoder.matches(password, farmer.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid contact or password");
        }

        return farmer;
    }

    public Farmer getById(String id) {
        return farmerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Farmer not found"));
    }
}
