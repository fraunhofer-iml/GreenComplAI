import { Box, Typography } from "@mui/material";

export default function CapabilityElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px dotted #aaa", borderRadius: 1 }}>
            <Typography variant="subtitle2">{element.idShort}</Typography>
            <Typography variant="body2" color="text.secondary">
                (Capability – keine weiteren Eigenschaften)
            </Typography>
        </Box>
    );
}
