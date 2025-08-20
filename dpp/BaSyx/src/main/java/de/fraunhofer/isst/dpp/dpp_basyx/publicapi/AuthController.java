package de.fraunhofer.isst.dpp.dpp_basyx.publicapi;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Value("${keycloak.url}")
  private String keycloakUrl;

  @Value("${keycloak.realm}")
  private String keycloakRealm;

  @Value("${keycloak.client-id}")
  private String clientId;

  @Value("${keycloak.client-secret}")
  private String clientSecret;

  private String getIssuerUri() {
    return keycloakUrl + "/realms/" + keycloakRealm;
  }

  @GetMapping("/callback")
  public void callback(@RequestParam String code, HttpServletResponse response) throws IOException {

    System.out.println("AuthController.callback() - Receive callback from Keycloak with code " + code + " and response " + response.toString());

    String tokenEndpoint = keycloakUrl + "/realms/" + keycloakRealm + "/protocol/openid-connect/token";

    RestTemplate restTemplate = new RestTemplate();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
    body.add("grant_type", "authorization_code");
    body.add("code", code);
    body.add("client_id", clientId);
    body.add("client_secret", clientSecret);
    body.add("redirect_uri", "http://localhost:8081/api/auth/callback");

    HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
    ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(tokenEndpoint, request, Map.class);

    if (tokenResponse.getStatusCode() == HttpStatus.OK) {
      // Session/Cookie setzen
      String accessToken = (String) tokenResponse.getBody().get("access_token");
      Cookie cookie = new Cookie("AUTH-TOKEN", accessToken);
      cookie.setHttpOnly(true);
      cookie.setPath("/");
      cookie.setSecure(false);

      // Cookie über Header setzen und SameSite hinzufügen
      String cookieHeader = String.format(
        "%s=%s; Path=%s; HttpOnly%s; SameSite=Lax",
        cookie.getName(),
        cookie.getValue(),
        cookie.getPath(),
        cookie.getSecure() ? "; Secure" : ""
      );
      response.addHeader("Set-Cookie", cookieHeader);

      // Weiterleitung zum Frontend
      response.sendRedirect("http://localhost:3004/dashboard");
    } else {
      response.sendError(tokenResponse.getStatusCodeValue(), "Token request failed");
    }
  }

  @GetMapping("/status")
  public ResponseEntity<?> authStatus(Authentication authentication) {
    if (authentication != null && authentication.isAuthenticated()) {
      return ResponseEntity.ok(Map.of(
        "authenticated", true,
        "user", authentication.getName()
      ));
    }
    return ResponseEntity.ok(Map.of("authenticated", false));
  }

  @GetMapping("/login-url")
  public ResponseEntity<String> getLoginUrl() {
    System.out.println("AuthController.getLoginUrl() - Method called");

    String loginUrl = getIssuerUri() + "/protocol/openid-connect/auth"
      + "?client_id=" + clientId
      + "&response_type=code"
      + "&scope=openid%20profile%20email"
      + "&redirect_uri=http://localhost:8081/api/auth/callback"; // Backend-Callback
    return ResponseEntity.ok(loginUrl);
  }
}
