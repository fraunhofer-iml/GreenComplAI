import { Typography, Box } from "@mui/material";
import React from "react";

interface MultiLangProps {
    element: {
        idShort: string;
        value?: { language: string; text: string }[];
    };
}

const MultiLanguagePropertyElement = ({ element }: MultiLangProps) => (
    <Box sx={{ p: 1, mb: 1, border: "1px solid #ccc", borderRadius: 1 }}>
        <Typography variant="subtitle2">{element.idShort}</Typography>
        <Typography variant="body2">
            {element.value?.map(val => `Description: ${val.text}`).join(" | ")}
        </Typography>
    </Box>
);

export default MultiLanguagePropertyElement;
