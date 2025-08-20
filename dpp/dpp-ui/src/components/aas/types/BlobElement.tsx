import { Box, Typography } from "@mui/material";

export default function BlobElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1 }}>
            <Typography variant="subtitle2">{element.idShort}</Typography>
            <Typography variant="body2">Mime-Type: {element.mimeType}</Typography>
            <Typography variant="body2">
                Inhalt: {element.value ? element.value.slice(0, 100) + "..." : "–"}
            </Typography>
        </Box>
    );
}
