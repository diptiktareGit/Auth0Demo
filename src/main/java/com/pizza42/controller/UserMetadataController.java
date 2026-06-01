package com.pizza42.controller;

import com.pizza42.service.Auth0ManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserMetadataController {

    private final Auth0ManagementService managementService;

    public UserMetadataController(Auth0ManagementService managementService) {
        this.managementService = managementService;
    }

    // Save address, card-last4, preferences to Auth0 user_metadata
    @PostMapping("/metadata")
    public ResponseEntity<?> saveMetadata(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body) {

        String userId = jwt.getSubject();

        // Fetch existing metadata so we don't overwrite orders or other fields
        Map<String, Object> existingMeta = new LinkedHashMap<>();
        try {
            existingMeta = managementService.getUserMetadata(userId);
        } catch (Exception ignored) {}

        // Merge in the new fields sent by the frontend
        existingMeta.put("saved_address",     body.getOrDefault("address",           Map.of()));
        existingMeta.put("saved_card_last4",  body.getOrDefault("cardLast4",         ""));
        existingMeta.put("fav_pizza",         body.getOrDefault("fav_pizza",         ""));
        existingMeta.put("birthday",          body.getOrDefault("birthday",          ""));
        existingMeta.put("marketing_consent", body.getOrDefault("marketing_consent", false));

        managementService.patchUserMetadata(userId, existingMeta);

        return ResponseEntity.ok(Map.of("saved", true));
    }
}
