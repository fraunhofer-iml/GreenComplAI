import React, {useState} from 'react';
import '../css/App.css';
import {Typography, Card, CardContent} from "@mui/material";
import {AAS} from "../data/AasZod";

type DPPDetailsCardProps = {
    dpp: AAS;
};

const DetailsCard: React.FC<DPPDetailsCardProps> = ({ dpp }) => (
    <Card sx={{ minWidth: 275, marginBottom: 2, marginRight: 2 }}>
        <CardContent>
            <Typography variant="h5" component="div">
                DPP Details
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                Name: {dpp.idShort}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                Type: {dpp.modelType}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                Number of Submodels: {dpp.submodels ? dpp.submodels.length : 0}
            </Typography>
        </CardContent>
    </Card>
);

export default DetailsCard;
