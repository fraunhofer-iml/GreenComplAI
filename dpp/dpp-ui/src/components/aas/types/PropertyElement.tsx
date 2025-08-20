import { Typography, Box } from "@mui/material";
import React from "react";

interface PropertyElementProps {
    element: {
        idShort: string;
        valueType: string;
        value?: string;
        description?: { language: string; text: string }[];
    };
}

const PropertyElement = ({ element }: PropertyElementProps) => (
    <Box sx={{ p: 1, mb: 1, border: "1px solid #ccc", borderRadius: 1 }}>
        <Typography variant="subtitle2">{element.idShort}</Typography>
        <Typography variant="body2" color="text.secondary">
            Type: {element.valueType}
        </Typography>
        {element.value !== undefined && (
            <Typography variant="body2">Value: {element.value}</Typography>
        )}
        {element.description?.map((d: any, i: number) => (
            <Typography key={i} variant="caption">{`Description: ${d.text}`}</Typography>
        ))}
    </Box>
);

export default PropertyElement;
