package de.fraunhofer.isst.dpp.dpp_basyx.publicapi;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.eclipse.digitaltwin.aas4j.v3.model.*;
import org.eclipse.digitaltwin.basyx.aasrepository.http.AasRepositoryApiHTTPController;
import org.eclipse.digitaltwin.basyx.http.Base64UrlEncodedIdentifier;
import org.eclipse.digitaltwin.basyx.http.Base64UrlEncodedIdentifierSize;
import org.eclipse.digitaltwin.basyx.http.pagination.Base64UrlEncodedCursor;
import org.eclipse.digitaltwin.basyx.http.pagination.PagedResult;
import org.eclipse.digitaltwin.basyx.submodelrepository.http.SubmodelRepositoryApiHTTPController;
import org.eclipse.digitaltwin.basyx.submodelservice.value.SubmodelElementValue;
import org.eclipse.digitaltwin.basyx.submodelservice.value.SubmodelValueOnly;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class DppPublicApi {

    private final AasRepositoryApiHTTPController aasController;
    private final SubmodelRepositoryApiHTTPController submodelController;

    public DppPublicApi(AasRepositoryApiHTTPController aasController, SubmodelRepositoryApiHTTPController submodelController) {
        this.aasController = aasController;
        this.submodelController = submodelController;
    }

    @RequestMapping(value = "/public/shells", produces = { "application/json" }, method = RequestMethod.GET)
    public ResponseEntity<PagedResult> getAllAssetAdministrationShells(
            @Parameter(in = ParameterIn.QUERY, description = "A list of specific Asset identifiers", schema = @Schema()) @Valid @RequestParam(value = "assetIds", required = false) List<SpecificAssetId> assetIds,
            @Parameter(in = ParameterIn.QUERY, description = "The Asset Administration Shell’s IdShort", schema = @Schema()) @Valid @RequestParam(value = "idShort", required = false) String idShort,
            @Min(0) @Parameter(in = ParameterIn.QUERY, description = "The maximum number of elements in the response array", schema = @Schema(allowableValues = {
                    "1" }, minimum = "0")) @Valid @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(in = ParameterIn.QUERY, description = "A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", schema = @Schema()) @Valid @RequestParam(value = "cursor", required = false) Base64UrlEncodedCursor cursor) {
        return aasController.getAllAssetAdministrationShells(assetIds, idShort, limit, cursor);
    }

    @RequestMapping(value = "/public/shells/{aasIdentifier}/submodel-refs", produces = { "application/json" }, method = RequestMethod.GET)
    public ResponseEntity<PagedResult> getAllSubmodelReferencesAasRepository(
            @Parameter(in = ParameterIn.PATH, description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("aasIdentifier") Base64UrlEncodedIdentifier aasIdentifier,
            @Min(0) @Parameter(in = ParameterIn.QUERY, description = "The maximum number of elements in the response array", schema = @Schema(allowableValues = {
                    "1" }, minimum = "0")) @Valid @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(in = ParameterIn.QUERY, description = "A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", schema = @Schema()) @Valid @RequestParam(value = "cursor", required = false) Base64UrlEncodedCursor cursor) {
        return aasController.getAllSubmodelReferencesAasRepository(aasIdentifier, limit, cursor);
    }

    @RequestMapping(value = "/public/shells/{aasIdentifier}", produces = { "application/json" }, method = RequestMethod.GET)
    public ResponseEntity<AssetAdministrationShell> getAssetAdministrationShellById(
            @Parameter(in = ParameterIn.PATH, description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("aasIdentifier") Base64UrlEncodedIdentifier aasIdentifier) {
        return aasController.getAssetAdministrationShellById(aasIdentifier);
    }

    @RequestMapping(value = "/public/shells/{aasIdentifier}/asset-information", produces = { "application/json" }, method = RequestMethod.GET)
    public ResponseEntity<AssetInformation> getAssetInformationAasRepository(
            @Parameter(in = ParameterIn.PATH, description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("aasIdentifier") Base64UrlEncodedIdentifier aasIdentifier) {
        return aasController.getAssetInformationAasRepository(aasIdentifier);
    }

    @RequestMapping(value = "/public/shells/{aasIdentifier}/asset-information/thumbnail", produces = { "application/octet-stream", "application/json" }, method = RequestMethod.GET)
    public ResponseEntity<Resource> getThumbnailAasRepository(
            @Parameter(in = ParameterIn.PATH, description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("aasIdentifier") Base64UrlEncodedIdentifier aasIdentifier) {
        return aasController.getThumbnailAasRepository(aasIdentifier);
    }

    @RequestMapping(value = "/public/submodels", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<PagedResult> getAllSubmodels(
            @Base64UrlEncodedIdentifierSize(min = 1, max = 3072) @Parameter(in = ParameterIn.QUERY, description = "The value of the semantic id reference (UTF8-BASE64-URL-encoded)", schema = @Schema()) @Valid @RequestParam(value = "semanticId", required = false) Base64UrlEncodedIdentifier semanticId,
            @Parameter(in = ParameterIn.QUERY, description = "The Asset Administration Shell’s IdShort", schema = @Schema()) @Valid @RequestParam(value = "idShort", required = false) String idShort,
            @Min(1) @Parameter(in = ParameterIn.QUERY, description = "The maximum number of elements in the response array", schema = @Schema(allowableValues = {
                    "1" }, minimum = "1")) @Valid @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(in = ParameterIn.QUERY, description = "A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", schema = @Schema()) @Valid @RequestParam(value = "cursor", required = false) Base64UrlEncodedCursor cursor,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getAllSubmodels(semanticId, idShort, limit, cursor, level, extent);

    }

    @RequestMapping(value = "/public/submodels/{submodelIdentifier}", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<Submodel> getSubmodelById(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getSubmodelById(submodelIdentifier, level, extent);
    }


    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/$value", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<SubmodelValueOnly> getSubmodelByIdValueOnly(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getSubmodelByIdValueOnly(submodelIdentifier, level, extent);
    }


    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/$metadata", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<Submodel> getSubmodelByIdMetadata(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level) {
        return submodelController.getSubmodelByIdMetadata(submodelIdentifier, level);
    }


    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/submodel-elements", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<PagedResult> getAllSubmodelElements(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Min(1) @Parameter(in = ParameterIn.QUERY, description = "The maximum number of elements in the response array", schema = @Schema(allowableValues = {
                    "1" }, minimum = "1")) @Valid @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(in = ParameterIn.QUERY, description = "A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", schema = @Schema()) @Valid @RequestParam(value = "cursor", required = false) Base64UrlEncodedCursor cursor,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getAllSubmodelElements(submodelIdentifier, limit, cursor, level, extent);
    }

    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/submodel-elements/{idShortPath}", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<SubmodelElement> getSubmodelElementByPathSubmodelRepo(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.PATH, description = "IdShort path to the submodel element (dot-separated)", required = true, schema = @Schema()) @PathVariable("idShortPath") String idShortPath,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getSubmodelElementByPathSubmodelRepo(submodelIdentifier, idShortPath, level, extent);
    }

    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/submodel-elements/{idShortPath}/$value", produces = { "application/json" }, method = RequestMethod.GET)
    ResponseEntity<SubmodelElementValue> getSubmodelElementByPathValueOnlySubmodelRepo(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.PATH, description = "IdShort path to the submodel element (dot-separated)", required = true, schema = @Schema()) @PathVariable("idShortPath") String idShortPath,
            @Parameter(in = ParameterIn.QUERY, description = "Determines the structural depth of the respective resource content", schema = @Schema(allowableValues = { "deep",
                    "core" }, defaultValue = "deep")) @Valid @RequestParam(value = "level", required = false, defaultValue = "deep") String level,
            @Parameter(in = ParameterIn.QUERY, description = "Determines to which extent the resource is being serialized", schema = @Schema(allowableValues = { "withBlobValue",
                    "withoutBlobValue" }, defaultValue = "withoutBlobValue")) @Valid @RequestParam(value = "extent", required = false, defaultValue = "withoutBlobValue") String extent) {
        return submodelController.getSubmodelElementByPathValueOnlySubmodelRepo(submodelIdentifier, idShortPath, level, extent);
    }


    @RequestMapping(value = "/public/submodels/{submodelIdentifier}/submodel-elements/{idShortPath}/attachment", produces = { "application/octet-stream", "application/json" }, method = RequestMethod.GET)
    ResponseEntity<Resource> getFileByPath(
            @Parameter(in = ParameterIn.PATH, description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)", required = true, schema = @Schema()) @PathVariable("submodelIdentifier") Base64UrlEncodedIdentifier submodelIdentifier,
            @Parameter(in = ParameterIn.PATH, description = "IdShort path to the submodel element (dot-separated)", required = true, schema = @Schema()) @PathVariable("idShortPath") String idShortPath) {
        return submodelController.getFileByPath(submodelIdentifier, idShortPath);
    }
}
