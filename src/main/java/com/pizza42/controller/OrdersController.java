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

        // Server-side email-verification guard — authoritative live check against
        if (!managementService.isEmailVerified(userId)) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "email_not_verified");
            err.put("message", "Please verify your email address before placing an order.");
            return ResponseEntity.status(403).body(err);
        }

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
                List<Map<String, Object>> persisted = loadPersistedOrders(userId);
                if (!persisted.isEmpty()) store.put(userId, persisted);
            } catch (Exception e) {
                System.err.println("[OrdersController] Could not pre-load orders from Auth0: " + e.getMessage());
            }
        }

        // Append new order to the (now-restored) in-memory list
        List<Map<String, Object>> userOrders = store.computeIfAbsent(userId, k -> new ArrayList<>());
        userOrders.add(order);

        // Persist full order list back to Auth0 APP metadata — app-controlled and
        // NOT user-editable, so order history can't be tampered with. Non-fatal.
        try {
            Map<String, Object> appMeta = managementService.getAppMetadata(userId);
            appMeta.put("orders", userOrders);
            managementService.patchAppMetadata(userId, appMeta);
        } catch (Exception e) {
            System.err.println("[OrdersController] Failed to persist orders to Auth0: " + e.getMessage());
        }

        return ResponseEntity.status(201).body(order);
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        // 1. Return from in-memory cache if available (server hasn't restarted)
        List<Map<String, Object>> memOrders = store.get(userId);
        if (memOrders != null && !memOrders.isEmpty()) {
            return ResponseEntity.ok(memOrders);
        }
        try {
            List<Map<String, Object>> persistedOrders = loadPersistedOrders(userId);
            if (!persistedOrders.isEmpty()) {
                store.put(userId, persistedOrders);   // reload into memory cache for this session
                return ResponseEntity.ok(persistedOrders);
            }
        } catch (Exception e) {
            System.err.println("[OrdersController] Failed to load orders from Auth0: " + e.getMessage());
        }

        return ResponseEntity.ok(List.of());
    }

    /**
     * Loads a user's order history from Auth0. Orders now live in app_metadata
     * (app-controlled). For users whose history predates this move, we fall back
     * to user_metadata once — the next order re-persists it to app_metadata.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadPersistedOrders(String userId) {
        Object saved = managementService.getAppMetadata(userId).get("orders");
        if (!(saved instanceof List)) {
            saved = managementService.getUserMetadata(userId).get("orders");  // legacy fallback
        }
        return (saved instanceof List)
            ? new ArrayList<>((List<Map<String, Object>>) saved)
            : new ArrayList<>();
    }
}
