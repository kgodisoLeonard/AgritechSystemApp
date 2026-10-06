package com.example.agritech_finance_api.ai;

import com.example.agritech_finance_api.ai.AnalyticsDtos.AnomalyReport;
import com.example.agritech_finance_api.ai.AnalyticsDtos.ClusterResponse;
import com.example.agritech_finance_api.ai.AnalyticsDtos.FarmerMatchResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class FarmerAnalyticsController {
    private final FarmerAnalyticsService service;

    public FarmerAnalyticsController(FarmerAnalyticsService service) {
        this.service = service;
    }

    @GetMapping("/farmer-clusters")
    public ClusterResponse clusters(@RequestParam(defaultValue = "3") int k) {
        return service.clusters(k);
    }

    @GetMapping("/farmers/{farmerId}/nearest")
    public FarmerMatchResponse nearestFarmers(
            @PathVariable String farmerId,
            @RequestParam(defaultValue = "5") int limit) {
        return service.nearestFarmers(farmerId, limit);
    }

    @GetMapping("/farmers/{farmerId}/anomalies")
    public AnomalyReport anomalies(@PathVariable String farmerId) {
        return service.anomalies(farmerId);
    }
}
