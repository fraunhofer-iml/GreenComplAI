package de.fraunhofer.isst.dpp.dpp_basyx.publicapi;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

  @GetMapping("/me")
  public Map<String, Object> getCurrentUser(@AuthenticationPrincipal Jwt principal) {
    Map<String, Object> userInfo = new HashMap<>();
    userInfo.put("username", principal.getClaimAsString("preferred_username"));
    userInfo.put("email", principal.getClaimAsString("email"));
    userInfo.put("roles", principal.getClaimAsStringList("roles"));
    return userInfo;
  }
}
