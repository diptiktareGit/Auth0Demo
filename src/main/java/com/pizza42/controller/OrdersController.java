package com.pizza42.controller;

import com.pizza42.service.Auth0ManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/orders")
@EnableMethodSecurity
public class OrdersController {

    private final Auth0ManagementService managementService;

    // In-memory cache: userId → orders (survives within a single server session)
    private final Map<String, List<Map<String, Object>>> store = new ConcurrentHashMap<>();

    public OrdersController(Auth0ManagementService managementService) {
        this.managementService = managementService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_place:order')")
    public ResponseEntity<Map<String, Object>> placeOrder(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body) {

        String userId = jwt.getSubject();

        Map<String, Object> order = new LinkedHashMap<>();
        order.put("id", UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.put("userId", userId);
        order.put("items", body.get("items"));
        order.put("total", body.get("total"));
        order.put("placedAt", Instant.now().toString());

        // If in-memory cache is empty for this user (e.g. after a server restart),
        // restore existing orders from Auth0 first so we don't lose history.
        if (!store.containsKey(userId)) {
            try {
                Map<String, Object> meta = managementService.getUserMetadata(userId);
                Object saved = meta.get("orders");
                if (saved instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> persisted = (List<Map<String, Object>>) saved;
                    store.put(userId, new ArrayList<>(persisted));
                }
            } catch (Exception e) {
                System.err.println("[OrdersController] Could not pre-load orders from Auth0: " + e.getMessage());
            }
        }

        // Append new order to the (now-restored) in-memory list
        List<Map<String, Object>> userOrders = store.computeIfAbsent(userId, k -> new ArrayList<>());
        userOrders.add(order);

        // Persist full order list back to Auth0 user_metadata (non-fatal if it fails)
        try {
            Map<String, Object> meta = managementService.getUserMetadata(userId);
            meta.put("orders", userOrders);
            managementService.patchUserMetadata(userId, meta);
        } catch (Exception e) {
            System.err.println("[OrdersController] Failed to persist orders to Auth0: " + e.getMessage());
        }

        return ResponseEntity.status(201).body(order);
    }

    @SuppressWarnings("unchecked")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        // 1. Return from in-memory cache if available (server hasn't restarted)
        List<Map<String, Object>> memOrders = store.get(userId);
        if (memOrders != null && !memOrders.isEmpty()) {
            return ResponseEntity.ok(memOrders);
        }

        // 2. Fallback: reload from Auth0 user_metadata after a server restart
        try {
            Map<String, Object> meta = managementService.getUserMetadata(userId);
            Object saved = meta.get("orders");
            if (saved instanceof List) {
                List<Map<String, Object>> persistedOrders = (List<Map<String, Object>>) saved;
                // Reload into memory cache for this session
                store.put(userId, new ArrayList<>(persistedOrders));
                return ResponseEntity.ok(persistedOrders);
            }
        } catch (Exception e) {
            System.err.println("[OrdersController] Failed to load orders from Auth0: " + e.getMessage());
        }

        return ResponseEntity.ok(List.of());
    }
}
