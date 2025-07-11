import {useEffect, useState} from 'react';
import { Paper } from '@mui/material';
import AASSelectPanel from '../components/dashboard/AASSelectPanel';
import {AAS, Submodel} from "../data/AasZod";
import AASOutput from "../components/dashboard/AASOutput";
import BaSyxFetchService from "../service/BaSyxFetchService";
import AASService from "../service/AASService";
import AASTable from "../components/dashboard/AASTable";

const Dashboard = () => {
    const [dpp, setDpp] = useState<AAS | null>(null);
    const [storedDPPs, setStoredDPPs] = useState<AAS[]>([]);
    const [submodels, setSubmodels] = useState<Submodel[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await fetchDPPs();
                console.log(result);
            } catch (error) {
                console.error("Fehler beim Laden:", error);
            }
        };

        fetchData();
    }, []);

    const fetchDPPs = async () => {
        const shells = await BaSyxFetchService.fetchShells();
        if (!shells) {
            console.warn(`❌ Ungültige oder leere Antwort erhalten`);
            return;
        }

        console.log(`✅ BaSyxFetchService.fetchShells() result: ${JSON.stringify(shells)}`);

        const allDPPs: AAS[] = [];

        for (const aas of shells) {
            const dpp = await AASService.parseAASJsonToDataModel(aas);
            if (!dpp) {
                console.warn(`⚠️ Konvertierung der AAS-Daten fehlgeschlagen für DPP: ${JSON.stringify(dpp)}`);
                return;
            }
            if (dpp) {
                // setStoredDPPs(prev => [...prev, dpp]);
                allDPPs.push(dpp);
            }
        }
        setStoredDPPs(allDPPs); // ⬅️ einmaliger State-Update
    };

    return (
        <>
            <Paper sx={{ height: 'auto', mb: 2 }}>
                <AASTable aas={storedDPPs} />
            </Paper>

            <Paper sx={{ height: 'auto', mb: 2 }}>
                <AASSelectPanel
                    setDpp={setDpp}
                    setSubmodels={setSubmodels}
                />
            </Paper>

            <Paper sx={{ height: 'auto', mb: 2 }}>
                <AASOutput aas={dpp} submodels={submodels} />
            </Paper>
        </>
    );
};

export default Dashboard;