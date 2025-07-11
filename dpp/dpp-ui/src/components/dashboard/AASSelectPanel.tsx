import React, {useEffect, useState} from 'react';
import '../../css/AASSelectPanel.css';
import {Box, Button, TextField, Typography} from "@mui/material";
import Grid from '@mui/material/Grid';
import BaSyxFetchService from "../../service/BaSyxFetchService";
import AASService from "../../service/AASService";
import {AAS, Submodel} from "../../data/AasZod";


interface Props {
    setDpp: (aas: AAS) => void;
    setSubmodels: React.Dispatch<React.SetStateAction<Submodel[]>>; // ChatGPT meinte, die Funktion muss so komisch aussehen
}

const AASSelectPanel: React.FC<Props> = ({setDpp, setSubmodels}) => {

    const [dppId, setDppId] = useState("");
    const [localDpp, setLocalDpp] = useState<AAS | null>(null);

    const handleChangeDppId = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDppId(event.target.value);
    };

    useEffect(() => {
        fetchSubmodels();
    }, [localDpp]);

    const handleFetchAas = () => {
        if (dppId === '') {
            console.error(`No DPP ID is given`);
            return;
        }

        // Fetch AAS
        BaSyxFetchService.fetchShell(dppId).then(async (res) => {
            // BaSyxFetchService.fetchShells().then(async (res) => {
            if (!res) {
                console.warn(`❌ Ungültige oder leere Antwort erhalten für AAS mit ID: ${dppId}`);
                return;
            }
            console.log(`✅ AAS result: ${JSON.stringify(res)}`);

            const dpp = await AASService.parseAASJsonToDataModel(res);

            if (!dpp) {
                console.warn(`⚠️ Konvertierung der AAS-Daten fehlgeschlagen für ID: ${dppId}`);
                return;
            }

            setDpp(dpp);
            setLocalDpp(dpp);
            setSubmodels([]);
        }).catch((error) => {
            console.log(`Error while fetching AAS with ID: ${dppId}`);
            console.error(error);
        })
    };

    const fetchSubmodels = async () => {
        if (!localDpp?.submodels) return;

        for (const submodel of localDpp.submodels) {
            const submodelId = submodel.keys.find(k => k.type === "Submodel")?.value;
            if (!submodelId) {
                console.warn("⚠️ Kein Submodel-ID gefunden, überspringe...");
                continue;
            }

            try {
                const res = await BaSyxFetchService.fetchSubmodel(submodelId);
                if (!res) {
                    console.log(`❌ Kein Submodel gefunden für ID: ${submodelId}`);
                    continue;
                }
                console.log(`✅ Submodel result: ${JSON.stringify(res)}`);

                const submodel = await AASService.parseSubmodelJsonToDataModel(res);

                if (!submodel) {
                    console.warn(`⚠️ Konvertierung der Submodel-Daten fehlgeschlagen für ID: ${submodelId}`);
                    return;
                }
                setSubmodels(prev => [...prev, submodel]);
            } catch (error) {
                console.error(`❌ Fehler beim Abrufen des Submodels mit ID: ${submodelId}`, error);
            }
        }
    };

    return (
        <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Fetch Digital Product Passport
            </Typography>
            <Grid container justifyContent="center">
                <Grid>
                    <Box display="flex" alignItems="center" gap={2}>
                        <TextField
                            label="DPP ID"
                            variant="outlined"
                            value={dppId}
                            onChange={handleChangeDppId}
                            sx={{ width: 600 }}
                        />
                        <Button
                            variant="contained"
                            disabled={dppId.length === 0}
                            onClick={handleFetchAas}
                        >
                            Load DPP
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AASSelectPanel;