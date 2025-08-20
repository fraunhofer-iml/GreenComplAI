import { Box, Typography } from "@mui/material";

export default function RelationshipElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px dashed #666", borderRadius: 1 }}>
            <Typography variant="subtitle2">{element.idShort}</Typography>
            <Typography variant="body2">Beziehung:</Typography>
            <Typography variant="caption">Von: {element.first?.keys?.[0]?.value}</Typography><br />
            <Typography variant="caption">Nach: {element.second?.keys?.[0]?.value}</Typography>
        </Box>
    );
}
