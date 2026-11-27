package com.knowledgehub.controller;

import com.knowledgehub.dto.response.ProviderCatalogResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catalog provider/model tĩnh để UI Settings và resolver dùng chung.
 */
@RestController
@RequestMapping("/api/providers")
public class ProviderCatalogController {

    @GetMapping("/catalog")
    public ResponseEntity<ProviderCatalogResponse> catalog() {
        return ResponseEntity.ok(ProviderCatalogResponse.all());
    }
}
