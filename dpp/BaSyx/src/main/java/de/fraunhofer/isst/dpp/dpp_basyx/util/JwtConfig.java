package de.fraunhofer.isst.dpp.dpp_basyx.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class JwtConfig {

  @Value("${keycloak.url}")
  private String keycloakUrl;

  @Value("${keycloak.realm}")
  private String keycloakRealm;

  public String getJwkSetUri() {
    return keycloakUrl + "/realms/" + keycloakRealm + "/protocol/openid-connect/certs";
  }

  @Bean
  public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withJwkSetUri(getJwkSetUri()).build();
  }
}
