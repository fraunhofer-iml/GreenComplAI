import React, {useState} from 'react';
import '../css/App.css';
import {Typography, Card, CardContent} from "@mui/material";
import {AAS} from "../data/AasZod";

type DPPPayloadCardProps = {
    dpp: AAS;
};

const PayloadCard: React.FC<DPPPayloadCardProps> = ({ dpp }) => (
    <Card sx={{ minWidth: 275, marginBottom: 2, marginRight: 2 }}>
        <CardContent>
            <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', mt: 2}}>
                                                    {JSON.stringify(dpp, null, 2)}
            </Typography>
        </CardContent>
    </Card>
);

export default PayloadCard;
