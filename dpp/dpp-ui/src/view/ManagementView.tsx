import '../css/App.css';
import {Box, Paper, TextField} from "@mui/material";
import AASCreatePanel from "../components/management/AASCreatePanel";
import '../css/ManagementView.css'
import React, {useState} from "react";

export default function ManagementView() {
    const [creationLog, setCreationLog] = useState<string[]>([]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
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
                        value={entry}
                        variant="filled"
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
