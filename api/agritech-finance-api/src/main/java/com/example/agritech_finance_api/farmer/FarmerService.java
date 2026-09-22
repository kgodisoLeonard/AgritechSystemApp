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

    public Farmer register(String name, String location, String contact, String password) {
        if (farmerRepository.findByContact(contact).isPresent()) {
            throw new ResponseStatusException(BAD_REQUEST, "Contact already registered");
        }

        Farmer farmer = new Farmer();
        farmer.setName(name);
        farmer.setLocation(location);
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
