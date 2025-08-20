class BaSyxService {

    // TODO: Add files in calls
    public static async createAAS(aasURL: string, aasPort: string, file: File): Promise<string> {
        const shells = process.env.REACT_APP_ENDPOINT_SHELLS;

        const username = process.env.REACT_APP_BASYX_USERNAME;
        const password = process.env.REACT_APP_BASYX_PASSWORD;
        const basicAuth = btoa(`${username}:${password}`);

        try {
            const text = await file.text();
            const response = await fetch(`${aasURL}:${aasPort}${shells}`, {
            // const response = await fetch(`${shells}`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    'Content-Type': 'application/json'
                },
                body: text,
            });

            if (!response.ok) {
                console.error(`HTTP error: ${response.status}`);
                return "";
            }

            const data = await response.json();
            // console.log(`✅ Response payload: ${JSON.stringify(data)}`);
            return JSON.stringify(data); // oder: return data; wenn du ein Objekt willst
        } catch (error) {
            console.error("Fehler beim Erstellen der AAS:", error);
            return "";
        }
    }

    public static async createSubmodel(aasURL: string, aasPort: string, file: File): Promise<string> {
        const submodels = process.env.REACT_APP_ENDPOINT_SUBMODELS;

        const username = process.env.REACT_APP_BASYX_USERNAME;
        const password = process.env.REACT_APP_BASYX_PASSWORD;
        const basicAuth = btoa(`${username}:${password}`);

        try {
            const text = await file.text();
            const response = await fetch(`${aasURL}:${aasPort}${submodels}`, {
            // const response = await fetch(`${submodels}`, {
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                //    mode: 'no-cors', // Nur aktivieren, wenn wirklich notwendig
                body: text
            });

            if (!response.ok) {
                console.error(`HTTP error: ${response.status}`);
                return "";
            }

            const json = await response.json();
            return JSON.stringify(json); // oder json direkt, wenn du ein Objekt willst
        } catch (error) {
            console.error("Fehler beim Hochladen:", error);
            return "";
        }
    }
}

export default BaSyxService;
