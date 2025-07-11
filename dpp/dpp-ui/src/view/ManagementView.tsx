import '../css/App.css';
import {Box, Paper, TextField} from "@mui/material";
import AASCreatePanel from "../components/management/AASCreatePanel";
import '../css/ManagementView.css'
import React, {useState} from "react";

export default function ManagementView() {

    const [creationLog, setCreationLog] = useState<string[]>([]);
    // const [creationLog, setCreationLog] = useState<string[]>([
    //     "AAS erfolgreich erstellt",
    //     "Submodel 1 verknüpft",
    //     "Fehler bei Submodel 2",
    // ]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                // border: 'solid black 1px',
                // background: '#ededed',
                height: 'auto',
            }}
        >
            <Paper className="create-dpp-paper">
                <AASCreatePanel
                    creationLog={creationLog}
                    setCreationLog={setCreationLog}
                />
            </Paper>
            <Paper className="output-paper">
                <h3>
                    Output logs of the creation process
                </h3>
                {creationLog.map((entry, index) => (
                    <TextField
                        className="output-field"
                        key={index}
                        // label={`Log ${index + 1}`}
                        // label={`Log`}
                        value={entry}
                        variant="filled"
                        // fullWidth
                        InputProps={{
                            readOnly: true,
                        }}
                    />
                ))}
            </Paper>
            <Paper className="default-paper"/>
        </Box>
    );
}