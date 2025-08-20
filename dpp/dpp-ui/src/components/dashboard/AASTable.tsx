import type {AAS, Submodel} from "../../data/AasZod";
import React, { useState, useCallback } from "react";
import {Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Alert} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BaSyxFetchService from "../../service/BaSyxFetchService";
import AASService from "../../service/AASService";

interface Props {
    aas: AAS[];
}

export default function AASTable({ aas }: Props) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchAas = useCallback(async (dppId: string) => {
        const res = await BaSyxFetchService.fetchShell(dppId);
        if (!res) return null;
        return await AASService.parseAASJsonToDataModel(res);
    }, []);

    const fetchSubmodels = useCallback(async (dpp: AAS): Promise<Submodel[]> => {
        const loadedSubmodels: Submodel[] = [];
        if (dpp.submodels) {
            for (const submodel of dpp.submodels) {
                const submodelId = submodel.keys.find(k => k.type === "Submodel")?.value;
                if (!submodelId) continue;
                try {
                    const res = await BaSyxFetchService.fetchSubmodel(submodelId);
                    if (!res) continue;
                    const parsed = await AASService.parseSubmodelJsonToDataModel(res);
                    if (parsed) loadedSubmodels.push(parsed);
                } catch (error) {
                    console.error(error);
                }
            }
        }
        return loadedSubmodels;
    }, []);

    const handleOpenDppDetail = async (dppId: string) => {
        setLoading(true);
        setError(null);
        try {
            const dpp = await handleFetchAas(dppId);
            if (!dpp) throw new Error("Failed to load DPP.");
            const loadedSubmodels = await fetchSubmodels(dpp);
            navigate(`/dashboard/dpp-detail-view/${dppId}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <Box display="flex" flexDirection="column" alignItems="center" py={3} px={4}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                DPP overview
            </Typography>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>idShort</strong></TableCell>
                            <TableCell><strong>Description (en)</strong></TableCell>
                            <TableCell><strong># Submodels</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {aas.map((aasEntry) => (
                            <TableRow key={aasEntry.id}>
                                <TableCell>
                                    <Button
                                        variant="text"
                                        color="primary"
                                        onClick={() => handleOpenDppDetail(aasEntry.id)}
                                        sx={{ textTransform: "none", padding: 0, minWidth: 0 }}
                                    >
                                        {aasEntry.id}
                                    </Button>
                                </TableCell>
                                <TableCell>{aasEntry.idShort}</TableCell>
                                <TableCell>
                                    {
                                        aasEntry.description?.find(d => d.language === "en")?.text || "–"
                                    }
                                </TableCell>
                                <TableCell>{aasEntry.submodels.length}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
