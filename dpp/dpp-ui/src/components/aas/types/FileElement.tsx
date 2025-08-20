import { Typography, Box, Link } from "@mui/material";
import React from "react";

interface FileProps {
    element: {
        idShort: string;
        mimeType: string;
        value?: string;
    };
}

const FileElement = ({ element }: FileProps) => (
    <Box sx={{ p: 1, mb: 1, border: "1px solid #ccc", borderRadius: 1 }}>
        <Typography variant="subtitle2">{element.idShort}</Typography>
        <Typography variant="body2">MIME: {element.mimeType}</Typography>
        {element.value && (
            <Link href={element.value} target="_blank" rel="noopener">
                {element.value}
            </Link>
        )}
    </Box>
);

export default FileElement;
