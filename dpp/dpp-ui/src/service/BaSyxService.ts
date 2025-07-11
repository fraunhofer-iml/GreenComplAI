import {json} from "node:stream/consumers";

class BaSyxService {

    public static async fetchDpp(dppId: string) {
        const shells = process.env.REACT_APP_ENDPOINT_POST_CREATE_SHELLS;

        let data;
        await fetch('http://localhost:8081' + shells, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(json => {
                data = json;
            })
            .catch(error => console.error(error));
        console.log(`Response payload data: ${JSON.stringify(data)}`);
        return data;
    }

    // public static async createSubmodel(aasURL: string, aasPort: string, file: File): Promise<string> {
    //     const submodels = process.env.REACT_APP_ENDPOINT_POST_CREATE_SUBMODELS;
    //     const formData = new FormData();
    //     formData.append('file', file);
    //
    //     let data;
    //     await fetch(aasURL + ':' + aasPort + submodels, {
    //         method: 'POST',
    //         body: formData
    //     })
    //         .then(response => response.json())
    //         .then(json => {
    //             data = json;
    //             console.log(`Response payload: ${JSON.stringify(json)}`);
    //         })
    //         .catch(error => console.error(error));
    //     return String(data);
    // }
}

export default BaSyxService;