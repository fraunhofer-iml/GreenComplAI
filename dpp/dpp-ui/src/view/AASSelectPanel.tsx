import React, {useState} from 'react';
import '../css/AASSelectPanel.css';
import {Button, Grid, Paper, TextareaAutosize, TextField} from "@mui/material";
import BaSyxService from "../service/BaSyxService";
import AASService from "../service/AASService";
import {AAS} from "../data/AasZod";


interface Props {
    setDpp: (aas: AAS) => void;
}

const AASSelectPanel: React.FC<Props> = ({ setDpp }) => {

    const [dppId, setDppId] = useState("");

    const handleChangeDppId = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDppId(event.target.value);
    };

    const handleFetchAas = () => {
        if (dppId === '') {
            console.error(`No DPP ID is given`);
            return;
        }

        // Fetch AAS
        BaSyxService.fetchDpp(dppId).then((res) => {
            console.log(`DPP result: ${JSON.stringify(res)}`);
            const dpp = AASService.parseAASJsonToDataModel(res);
            setDpp(dpp);
        })
    };

    return (
        <div>
            <h1>
                Fetch Digital Product Passport
            </h1>
            <Grid container spacing={2}>
                <Grid size={12}>
                    <Grid container spacing={2}>
                        <Grid size={10}>
                            <TextField
                                id="outlined-basic"
                                sx={{margin: '10px', width: '100%'}}
                                label="DPP ID"
                                variant="outlined"
                                value={dppId}
                                onChange={handleChangeDppId}
                            />
                        </Grid>
                        <Grid size={2}>
                            <div className="fetch-dpp-button">
                                <Button
                                    variant="contained"
                                    component="span"
                                    sx={{margin: '10px'}}
                                    disabled={dppId.length === 0}
                                    onClick={handleFetchAas}
                                >
                                    Load DPP
                                </Button>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default AASSelectPanel;