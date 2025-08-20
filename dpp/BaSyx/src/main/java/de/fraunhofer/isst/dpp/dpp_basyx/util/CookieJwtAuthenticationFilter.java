package de.fraunhofer.isst.dpp.dpp_basyx.util;

import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URL;
import java.text.ParseException;
import java.util.Collections;

@Component
public class CookieJwtAuthenticationFilter extends OncePerRequestFilter {

  public static final String COOKIE_NAME = "AUTH-TOKEN";

  private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

  @Autowired
  public CookieJwtAuthenticationFilter(JwtConfig jwtConfig) throws Exception {
    JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(jwtConfig.getJwkSetUri()));
    jwtProcessor = new DefaultJWTProcessor<>();
    jwtProcessor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {

    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
      for (Cookie cookie : cookies) {
        if (COOKIE_NAME.equals(cookie.getName())) {
          String token = cookie.getValue();
          try {
            JWTClaimsSet claims = validateToken(token);
            Authentication auth = buildAuthentication(claims);
            SecurityContextHolder.getContext().setAuthentication(auth);
          } catch (Exception e) {
            System.out.println("CookieJwtAuthenticationFilter - Invalid token: " + e.getMessage());
          }
          break;
        }
      }
    }

    filterChain.doFilter(request, response);
  }

  private JWTClaimsSet validateToken(String token) throws Exception {
    SignedJWT signedJWT = SignedJWT.parse(token);
    return jwtProcessor.process(signedJWT, null);
  }

  private Authentication buildAuthentication(JWTClaimsSet claims) throws ParseException {
    String username = claims.getSubject();
    return new UsernamePasswordAuthenticationToken(
      username,
      null,
      Collections.singletonList(new SimpleGrantedAuthority("USER"))
    );
  }
}
