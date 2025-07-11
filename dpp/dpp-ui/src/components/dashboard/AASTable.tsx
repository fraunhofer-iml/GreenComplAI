import type {AAS, Submodel} from "../../data/AasZod";
import React from "react";
import {Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography} from "@mui/material";

interface Props {
    aas: AAS[];
}

export default function AASTable({ aas }: Props) {
    return (
        <Box display="flex" flexDirection="column" alignItems="center" py={3} px={4}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                DPP overview
            </Typography>
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
                                <TableCell>{aasEntry.id}</TableCell>
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