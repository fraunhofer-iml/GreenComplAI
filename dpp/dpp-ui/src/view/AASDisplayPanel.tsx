import React, {useState} from 'react';
import '../css/AASSelectPanel.css';
import {Button, Grid, Paper, TextareaAutosize, TextField} from "@mui/material";

const AASDisplayPanel: React.FC = () => {

    const [basyxUrl, setBasyxUrl] = useState("");
    const [basyxPort, setBasyxPort] = useState("");
    const [aasFile, setAasFile] = useState<File | undefined>();
    const [submodelFiles, setSubmodelFiles] = useState<File[]>([]);

    const handleChangeBasyxUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBasyxUrl(event.target.value);
    };

    const handleChangeBasyxPort = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBasyxPort(event.target.value);
    };

    const handleAASFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setAasFile(file);
        // console.log(`File: ${file}`);
        // console.log(`File.name: ${file?.name}`);
    };

    const handleSubmodelFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setSubmodelFiles(Array.from(files));
            Array.from(files).forEach(file => {
                console.log(file.webkitRelativePath); // Gibt den relativen Pfad der File aus
                console.log(file.name); // Gibt den Namen der File aus
            });
        }
    };

    const handleCreateAas = () => {
        if (!aasFile) {
            console.error(`No AAS-File`);
            return;
        }

        if (submodelFiles.length < 1) {
            console.error(`No AAS-Submodel-Files`);
            return;
        }
    };

    return (
        <div>
            <h1>
                Create new Digital Product Passport
            </h1>
            <Grid container spacing={2}>
                <Grid size={8}>
                    <TextField
                        id="outlined-basic"
                        sx={{margin: '10px', width: '100%'}}
                        label="BaSyx URL"
                        variant="outlined"
                        value={basyxUrl}
                        onChange={handleChangeBasyxUrl}
                    />
                </Grid>
                <Grid size={4}>
                    <TextField
                        id="outlined-basic"
                        sx={{margin: '10px'}}
                        label="BaSyx Port"
                        variant="outlined"
                        value={basyxPort}
                        onChange={handleChangeBasyxPort}
                    />
                </Grid>
                <Grid size={12}>
                    <Grid container spacing={2}>
                        <Grid size={8}>
                            <TextField
                                id="outlined-basic"
                                sx={{margin: '10px', width: '100%'}}
                                label="AAS File"
                                variant="outlined"
                                disabled
                                value={aasFile?.name}
                                InputLabelProps={{
                                    shrink: aasFile !== null && aasFile !== undefined, // Label nach oben schieben, wenn Wert nicht leer ist
                                }}
                            />
                        </Grid>
                        <Grid size={4}>
                            <div className="aas-picker">
                                <input
                                    accept="application/json"
                                    style={{display: 'none', margin: '10px'}}
                                    id="aas-file-upload"
                                    type="file"
                                    onChange={handleAASFileChange}
                                />
                                <label htmlFor="aas-file-upload">
                                    <Button
                                        variant="contained"
                                        component="span"
                                        sx={{margin: '10px'}}
                                    >
                                        AAS-Datei auswählen
                                    </Button>
                                </label>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid size={12}>
                    <Grid container spacing={2}>
                        <Grid size={8}>
                            <TextField
                                id="outlined-basic"
                                sx={{margin: '10px', width: '100%'}}
                                label="Submodels"
                                variant="outlined"
                                disabled
                                multiline
                                value={submodelFiles.map(file => file.name).join(', ')} // Annahme: aasFiles ist ein Array von Dateien
                                InputLabelProps={{
                                    shrink: submodelFiles.length > 0, // Label nach oben schieben, wenn Dateien vorhanden sind
                                }}
                            />
                        </Grid>
                        <Grid size={4}>
                            <div className="submodel-picker">
                                <input
                                    accept="application/json"
                                    style={{display: 'none', margin: '10px'}}
                                    id="submodel-file-upload"
                                    type="file"
                                    multiple // Erlaubt die Auswahl mehrerer Dateien
                                    onChange={handleSubmodelFilesChange}
                                />
                                <label htmlFor="submodel-file-upload">
                                    <Button
                                        variant="contained"
                                        component="span"
                                        sx={{margin: '10px'}}
                                    >
                                        Submodels auswählen
                                    </Button>
                                </label>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid size={12}>
                    <Grid container spacing={2}>
                        <Grid size={8}>
                            <div></div>
                        </Grid>
                        <Grid size={4}>
                            <div className="create-dpp-button">
                                <Button
                                    variant="contained"
                                    component="span"
                                    sx={{margin: '10px'}}
                                    disabled={
                                    submodelFiles.length === 0 ||
                                        basyxPort.length === 0 ||
                                        basyxUrl.length === 0 ||
                                        aasFile === null || aasFile === undefined
                                }
                                    onClick={handleCreateAas}
                                >
                                    Create DPP
                                </Button>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default AASDisplayPanel;