package de.fraunhofer.isst.dpp.dpp_basyx.publicapi;

import org.eclipse.digitaltwin.aas4j.v3.model.AssetAdministrationShell;
import org.eclipse.digitaltwin.basyx.aasrepository.http.AasRepositoryApiHTTPController;
import org.eclipse.digitaltwin.basyx.core.exceptions.ElementDoesNotExistException;
import org.eclipse.digitaltwin.basyx.http.Base64UrlEncodedIdentifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class DppManagementApi {

  private final AasRepositoryApiHTTPController aasController;

  public DppManagementApi(AasRepositoryApiHTTPController aasController) {
    this.aasController = aasController;
  }

  @RequestMapping(value = "/public/search/{dppId}", produces = {"application/json"}, method = RequestMethod.GET)
  public ResponseEntity<String> findSkalaAAS(@PathVariable String dppId) {
//    Prüft, ob eine AAS mit der Produkt-ID vorhanden ist
//    Wenn nicht, holt er sich die Daten über den PRISMA-Client
//    Baut daraus eine AAS + Submodels + Properties
//    Registriert sie im AAS-Server (oder speichert lokal im InMemoryRegistry)
//    Zeigt sie dann in der Tabelle an

    Base64UrlEncodedIdentifier encodedId = new Base64UrlEncodedIdentifier(dppId);
    AssetAdministrationShell aas = null;
    try {
      aas = aasController.getAssetAdministrationShellById(encodedId).getBody();
    } catch (ElementDoesNotExistException e) {
      System.out.println("No AAS is registered for the specific product ID");
      System.out.println("The AAS will be fetched");
    }

    if (aas != null) {
      System.out.println("AAS is already registered for the specific product ID");
      return new ResponseEntity<>("AAS is already registered for the specific product ID", HttpStatusCode.valueOf(200));
    }
    return new ResponseEntity<>("AAS is was registered for the specific product ID", HttpStatusCode.valueOf(201));
  }
}
