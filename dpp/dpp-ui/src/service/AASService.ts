import {AssetAdministrationShell, BaSyxAASResponse, Submodel} from "../data/AasZod";

class AASService {

    public static async parseAASJsonToDataModel(json: unknown) {
        console.log("parseAASJsonToDataModel: ", json);
        const result = AssetAdministrationShell.safeParse(json);

        if (!result.success) {
            console.error('Parsing/Validation Fehler:', JSON.stringify(result.error.format(), null, 2));
            throw new Error("Ungültiges AAS JSON.");
        }

        console.log("JSON erfolgreich validiert.");
        return result.data; // getyptes und validiertes AAS-Objekt
    }

    public static async parseSubmodelJsonToDataModel(json: unknown) {
        const result = Submodel.safeParse(json);

        if (!result.success) {
            console.error("Parsing/Validation Fehler:", JSON.stringify(result.error.format(), null, 2));
            throw new Error("Ungültiges Submodel JSON.");
        }

        console.log("Submodel JSON erfolgreich validiert.");
        return result.data; // getyptes und validiertes Submodel-Objekt
    }
}

export default AASService;
