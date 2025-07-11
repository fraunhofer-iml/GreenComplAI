import {AssetAdministrationShell} from "../data/AasZod";
import {z} from "zod";

class AASService {

    public static parseAASJsonToDataModel(json: unknown) {
        // console.log(`AAS received - json: ${JSON.stringify(json)}`);
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;

        // BaSyx liefert das Array unter dem Key "result"
        const aasArray = parsed.result;
        console.log(`AAS received - aasArray: ${JSON.stringify(aasArray)}`);

        const result = z.array(AssetAdministrationShell).safeParse(aasArray);

        if (!result.success) {
            console.error('❌ Parsing/Validation Fehler:', JSON.stringify(result.error.format(), null, 2));
            throw new Error("Ungültiges AAS JSON.");
        }

        console.log("✅ JSON erfolgreich validiert.");
        // console.log(`AAS received - result.data: ${JSON.stringify(result.data)}`);
        // console.log(`AAS received - result.data[0]: ${JSON.stringify(result.data[0])}`);
        return result.data[0]; // getyptes und validiertes AAS-Objekt
    }
}

export default AASService;
