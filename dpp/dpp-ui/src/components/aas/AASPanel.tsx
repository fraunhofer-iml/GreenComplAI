import {Box, Paper, Typography} from "@mui/material";
import {AAS, Submodel} from "../../data/AasZod";

export default function AASPanel({aas, submodels}: { aas: AAS, submodels: Submodel[] }) {
    return (
        <>
            <Box display="flex" gap={5} m={2}>

                <Paper elevation={1} sx={{p: 2, flex: 1, minWidth: 220}}>
                    <Typography variant="h6">Name: {aas.idShort}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        ID: {aas.id}
                    </Typography>
                    {aas.description && (
                        <Typography variant="body2" sx={{mt: 1}}>
                            {aas.description.map(d => `${d.language}: ${d.text}`).join(" | ")}
                        </Typography>
                    )}
                </Paper>
            </Box>
        </>
    );
}
