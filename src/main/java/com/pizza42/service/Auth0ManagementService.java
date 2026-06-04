package com.pizza42.service;

import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class Auth0ManagementService {

    @Value("${auth0.domain}")
    private String domain;

    @Value("${auth0.management.client-id}")
    private String mgmtClientId;

    @Value("${auth0.management.client-secret}")
    private String mgmtClientSecret;

    // Apache HttpClient 5 supports PATCH; Java's default HttpURLConnection does not
    private final RestTemplate restTemplate = new RestTemplate(
        new HttpComponentsClientHttpRequestFactory(HttpClients.createDefault())
    );

    /** Fetches a short-lived M2M token from Auth0. */
    @SuppressWarnings("unchecked")
    public String getManagementToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of(
            "client_id",     mgmtClientId,
            "client_secret", mgmtClientSecret,
            "audience",      "https://" + domain + "/api/v2/",
            "grant_type",    "client_credentials"
        );

        ResponseEntity<Map> res = restTemplate.postForEntity(
            "https://" + domain + "/oauth/token",
            new HttpEntity<>(body, headers),
            Map.class
        );
        return (String) res.getBody().get("access_token");
    }

    /**
     * Builds the Management API URL for a given user ID.
     * Uses URI.create() with pre-encoded ID to prevent RestTemplate double-encoding.
     */
    private URI userUri(String userId) {
        // Encode only the | character — Auth0 user IDs are "provider|id"
        String encodedId = URLEncoder.encode(userId, StandardCharsets.UTF_8);
        return URI.create("https://" + domain + "/api/v2/users/" + encodedId);
    }

    /** Returns the user_metadata map for the given Auth0 user ID. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserMetadata(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getManagementToken());

        ResponseEntity<Map> res = restTemplate.exchange(
            userUri(userId), HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        Object meta = res.getBody().get("user_metadata");
        return (meta instanceof Map) ? (Map<String, Object>) meta : new LinkedHashMap<>();
    }

    /**
     * Returns the LIVE email_verified status straight from Auth0, not from the
     * access token. The token can't be trusted as a fresh source for this flag
     * (Actions don't re-run on silent refresh after a user clicks the verify
     * link), so we read the authoritative value from the Management API.
     */
    @SuppressWarnings("unchecked")
    public boolean isEmailVerified(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getManagementToken());

        ResponseEntity<Map> res = restTemplate.exchange(
            userUri(userId), HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        Object verified = (res.getBody() == null) ? null : res.getBody().get("email_verified");
        return Boolean.TRUE.equals(verified);
    }

    /** PATCHes user_metadata for the given Auth0 user ID. */
    public void patchUserMetadata(String userId, Map<String, Object> metadata) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(getManagementToken());

        Map<String, Object> payload = Map.of("user_metadata", metadata);
        restTemplate.exchange(
            userUri(userId), HttpMethod.PATCH,
            new HttpEntity<>(payload, headers), Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getAppMetadata(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getManagementToken());

        ResponseEntity<Map> res = restTemplate.exchange(
            userUri(userId), HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        Object meta = res.getBody().get("app_metadata");
        return (meta instanceof Map) ? (Map<String, Object>) meta : new LinkedHashMap<>();
    }

    public void patchAppMetadata(String userId, Map<String, Object> metadata) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(getManagementToken());

        Map<String, Object> payload = Map.of("app_metadata", metadata);
        restTemplate.exchange(
            userUri(userId), HttpMethod.PATCH,
            new HttpEntity<>(payload, headers), Map.class);
    }
}
