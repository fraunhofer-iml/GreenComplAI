import Util from "../util/Util";

class BaSyxFetchService {

    public static async fetchShell(dppId: string) {
        const shells = process.env.REACT_APP_ENDPOINT_SHELLS;
        const encodedId = Util.base64UrlEncode(dppId);

        const username = process.env.REACT_APP_BASYX_USERNAME;
        const password = process.env.REACT_APP_BASYX_PASSWORD;
        const basicAuth = btoa(`${username}:${password}`);

        try {
            const response = await fetch(`http://localhost:8081${shells}/${encodedId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                console.error(`HTTP error: ${response.status}`);
                return null;
            }

            // Nur einmal den Body lesen
            const data = await response.json();

            // Debug-Log
            console.log(`Response payload data  of BaSyxFetchService.fetchShell(dppId): ${JSON.stringify(data)}`);
            return data;
        } catch (error) {
            console.error("Fehler beim Abrufen der DPP:", error);
            return null;
        }
    }

    public static async fetchSubmodel(subId: string) {
        const path = process.env.REACT_APP_ENDPOINT_SUBMODELS;
        const encodedId = Util.base64UrlEncode(subId);

        const username = process.env.REACT_APP_BASYX_USERNAME;
        const password = process.env.REACT_APP_BASYX_PASSWORD;
        const basicAuth = btoa(`${username}:${password}`);

        try {
            // Due to use of proxy, this endpoint can be shortened
            const response = await fetch(`http://localhost:8081${path}/${encodedId}`, {
            // const response = await fetch(`${path}/${subId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error(`❌ HTTP error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            console.log(`Response payload data  of BaSyxFetchService.fetchSubmodel(subId): ${JSON.stringify(data)}`);
            return data;
        } catch (error) {
            console.error("Fehler beim Abrufen des Submodels:", error);
            return null;
        }
    }

    public static async fetchShells() {
        const shells = process.env.REACT_APP_ENDPOINT_SHELLS;

        const username = process.env.REACT_APP_BASYX_USERNAME;
        const password = process.env.REACT_APP_BASYX_PASSWORD;
        const basicAuth = btoa(`${username}:${password}`);

        try {
            const response = await fetch(`http://localhost:8081${shells}`, {
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                console.error(`❌ HTTP error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            console.log(`Response of BaSyxFetchService.fetchShells(): ${JSON.stringify(data)}`);
            return data.result;
        } catch (error) {
            console.error('Error fetching AAS shells:', error);
            return null;
        }
    }
}

export default BaSyxFetchService;
