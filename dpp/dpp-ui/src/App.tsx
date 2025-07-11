import React, {useState} from 'react';
import './css/App.css';
import {Box, Paper} from "@mui/material";
import AASSelectPanel from "./view/AASSelectPanel";
import {AAS} from "./data/AasZod";

function App() {

    const [dpp, setDpp] = useState<AAS | null>(null);

    return (
        <div style={{height: '100vh'}}>
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    border: 'solid black 1px',
                    background: '#ededed',
                }}
            >
                {/*{dpp === null && (*/}
                <>
                    <Paper className="App-header">
                        <h1>
                            DPP App
                        </h1>
                    </Paper>
                    <Paper className="select-dpp-paper">
                        <AASSelectPanel
                            setDpp={setDpp}
                        />
                    </Paper>
                </>
                {/*)}*/}
                {dpp && (
                    <>
                        <Paper className="info-paper">
                            <h1>
                                DPP with ID {dpp.id}
                            </h1>
                            <br />
                            <span>
                                {JSON.stringify(dpp, null, 2)}
                            </span>
                            {/*<AASDisplayPanel/>*/}
                        </Paper>
                    </>
                )}
            </Box>
        </div>
    );
}

export default App;
