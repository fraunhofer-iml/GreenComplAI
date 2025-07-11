import React, { useState } from "react";
import { Paper, Tabs, Tab, Box, Typography } from "@mui/material";
import type { AAS, Submodel } from "../../data/AasZod"; // Dein Typ-Import

interface Props {
    aas: AAS | null;
    submodels: Submodel[];
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`submodel-tabpanel-${index}`}
            aria-labelledby={`submodel-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
    );
}

export default function AASOutput({ aas, submodels }: Props) {
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    if (!aas) {
        return <Typography variant="body1">Keine AAS-Daten geladen.</Typography>;
    }

    return (
        <Box>
            {/* AAS-Grundinfos oben */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6">{aas.idShort}</Typography>
                <Typography variant="body2" color="text.secondary">
                    ID: {aas.id}
                </Typography>
                {aas.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {aas.description.map(d => `${d.language}: ${d.text}`).join(" | ")}
                    </Typography>
                )}
            </Box>

            {/* Tabs für Submodelle */}
            <Tabs value={tabIndex} onChange={handleChange} aria-label="Submodel Tabs">
                {submodels.map((sm, idx) => (
                    <Tab key={sm.id} label={sm.idShort} id={`submodel-tab-${idx}`} />
                ))}
            </Tabs>

            {/* Tab Panels mit Submodel-Details */}
            {submodels.map((sm, idx) => (
                <TabPanel key={sm.id} value={tabIndex} index={idx}>
                    <Typography variant="subtitle1">ID: {sm.id}</Typography>
                    {sm.description && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            {sm.description.map(d => `${d.language}: ${d.text}`).join(" | ")}
                        </Typography>
                    )}

                    {/* SubmodelElements rudimentär auflisten */}
                    {sm.submodelElements.map((el, i) => (
                        <Box key={i} sx={{ mb: 1, p: 1, border: "1px solid #ccc", borderRadius: 1 }}>
                            <Typography variant="body2">
                                <strong>{el.modelType}</strong> - idShort: {el.idShort}
                            </Typography>
                            {"value" in el && (
                                <Typography variant="body2" color="text.secondary">
                                    Wert: {JSON.stringify(el.value)}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </TabPanel>
            ))}
        </Box>
    );
}
