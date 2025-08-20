import { Typography, Box } from "@mui/material";
import React from "react";

interface RangeProps {
    element: {
        idShort: string;
        valueType: string;
        min?: string;
        max?: string;
    };
}

const RangeElement = ({ element }: RangeProps) => (
    <Box sx={{ p: 1, mb: 1, border: "1px solid #ccc", borderRadius: 1 }}>
        <Typography variant="subtitle2">{element.idShort}</Typography>
        <Typography variant="body2">
            {`Range (${element.valueType}): ${element.min ?? "?"} – ${element.max ?? "?"}`}
        </Typography>
    </Box>
);

export default RangeElement;
