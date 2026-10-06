package com.example.agritech_finance_api.farmer;

import com.example.agritech_finance_api.farmer.dto.FarmerResponse;
import com.example.agritech_finance_api.farmer.dto.LoginRequest;
import com.example.agritech_finance_api.farmer.dto.RegisterRequest;
import org.springframework.web.bind.annotation.*; // Imports REST annotations like @RestController, @RequestMapping, @PostMapping, @GetMapping, @RequestBody, and @PathVariable
import org.springframework.http.HttpStatus;       // Imports HTTP status codes like HttpStatus.CREATED
import org.springframework.http.ResponseEntity;   // Imports ResponseEntity for managing HTTP response entity bodies and headers

@RestController
@RequestMapping("/api/farmers")
public class FarmerController {

    private final FarmerService farmerService;

    public FarmerController(FarmerService farmerService) {
        this.farmerService = farmerService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public FarmerResponse register(@RequestBody RegisterRequest request) {
        return new FarmerResponse(farmerService.register(
<<<<<<< HEAD
                request.getName(), request.getLocation(), request.getContact(), request.getPassword()));
=======
                request.getName(), request.getLocation(), request.getProvince(), request.getCountry(), request.getContact(), request.getPassword()));
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
    }

    @PostMapping("/login")
    public FarmerResponse login(@RequestBody LoginRequest request) {
        return new FarmerResponse(farmerService.login(request.getContact(), request.getPassword()));
    }

    @GetMapping("/{id}")
    public FarmerResponse getFarmer(@PathVariable String id) {
        return new FarmerResponse(farmerService.getById(id));
    }
}