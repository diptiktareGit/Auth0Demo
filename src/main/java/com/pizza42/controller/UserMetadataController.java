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

    // Fetch current user_metadata from Auth0 (always fresh — bypasses ID token cache)
    @GetMapping("/metadata")
    public ResponseEntity<?> getMetadata(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        try {
            Map<String, Object> meta = managementService.getUserMetadata(userId);
            return ResponseEntity.ok(meta);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of());
        }
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

        // Merge in only the fields that are actually present in the request body
        // (don't overwrite existing fields like fav_pizza or orders with defaults
        //  when the body is just an address-save or preference-save payload)
        if (body.containsKey("address"))                  existingMeta.put("saved_address",           body.get("address"));
        if (body.containsKey("cardLast4"))                existingMeta.put("saved_card_last4",        body.get("cardLast4"));
        if (body.containsKey("fav_pizza"))                existingMeta.put("fav_pizza",               body.get("fav_pizza"));
        if (body.containsKey("birthday"))                 existingMeta.put("birthday",                body.get("birthday"));
        if (body.containsKey("marketing_consent"))        existingMeta.put("marketing_consent",       body.get("marketing_consent"));

        managementService.patchUserMetadata(userId, existingMeta);

        if (body.containsKey("garlic_bread_base_count")) {
            Map<String, Object> appMeta = new LinkedHashMap<>();
            try { appMeta = managementService.getAppMetadata(userId); } catch (Exception ignored) {}
            appMeta.put("garlic_bread_base_count", body.get("garlic_bread_base_count"));
            managementService.patchAppMetadata(userId, appMeta);
        }

        return ResponseEntity.ok(Map.of("saved", true));
    }
}
