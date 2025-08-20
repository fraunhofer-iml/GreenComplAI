import React, {useEffect, useState} from 'react';
import '../../css/App.css';
import {Box, Button, Grid, IconButton, InputAdornment, TextField} from "@mui/material";
import BaSyxUploadService from "../../service/BaSyxUploadService";
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
    creationLog: string[];
    setCreationLog: React.Dispatch<React.SetStateAction<string[]>>; // ChatGPT meinte, die Funktion muss so komisch aussehen
}

const AASCreatePanel: React.FC<Props> = ({ creationLog, setCreationLog }) => {

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
    };

    const handleSubmodelFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setSubmodelFiles(Array.from(files));
            Array.from(files).forEach(file => {
                console.log(file.name);
            });
        }
    };

    const handleCreateAas = async () => {
        // Create AAS
        if (aasFile != undefined) {
            await BaSyxUploadService.createAAS(basyxUrl, basyxPort, aasFile).then((res) => {
                console.info(`AAS were added :)`);
                // setCreationLog([...creationLog, "AAS were added"]);
                setCreationLog((prevLog: string[]) => [...prevLog, "✅ AAS wurde erfolgreich erstellt"]);
            });
        }

        if (submodelFiles.length < 1) {
            console.info(`No AAS-Submodel-Files were added`);
            return;
        }
        for (const file of submodelFiles) {
            const res = await BaSyxUploadService.createSubmodel(basyxUrl, basyxPort, file);

            console.info(`Result in JSON of adding Submodel: ${JSON.stringify(res)}`);
            console.info(`Result of adding Submodel: ${res}`);

            if (res === "") {
                console.info(`Submodel was NOT added`);
                setCreationLog((prevLog) => [...prevLog, `❌ Fehler beim Hochladen von Submodel`]);
            } else {
                console.info(`Submodel was added`);
                setCreationLog((prevLog) => [...prevLog, `✅ Submodel wurde erfolgreich hochgeladen`]);
            }
        }
    };

    return (
        <Box>
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
                                value={aasFile ? aasFile?.name : ""}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: aasFile && (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setAasFile(undefined)} edge="end">
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                InputLabelProps={{
                                    shrink: !!aasFile,
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
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: submodelFiles.length > 0 && (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setSubmodelFiles([])} edge="end">
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                InputLabelProps={{
                                    shrink: submodelFiles.length > 0,
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
                                        basyxPort.length === 0 ||
                                        basyxUrl.length === 0 ||
                                        ((aasFile === null || aasFile === undefined) && submodelFiles.length === 0 )
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
        </Box>
    );
};

export default AASCreatePanel;
