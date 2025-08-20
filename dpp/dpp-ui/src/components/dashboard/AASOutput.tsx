import React, {useState} from "react";
import {Paper, Tabs, Tab, Box, Typography, Divider} from "@mui/material";
import type {AAS, Submodel} from "../../data/AasZod";
import AASPanel from "../aas/AASPanel";
import SubmodelTabs from "../aas/SubmodelTabs";

interface Props {
    aas: AAS | null;
    submodels: Submodel[];
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
    const {children, value, index, ...other} = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`submodel-tabpanel-${index}`}
            aria-labelledby={`submodel-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{p: 2}}>{children}</Box>}
        </div>
    );
}

export default function AASOutput({aas, submodels}: Props) {
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    if (!aas) {
        return <Typography variant="body1">Keine AAS-Daten geladen.</Typography>;
    }

    return (
        <>
            <AASPanel aas={aas} submodels={submodels}/>
            <SubmodelTabs submodels={submodels}/>
        </>
    );
}
