import { Box, Typography } from "@mui/material";
import SubmodelElementRenderer from "../SubmodelElementRenderer";

export default function SubmodelElementListElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px dashed #666", borderRadius: 1 }}>
            <Typography variant="subtitle1">{element.idShort} (Liste)</Typography>
            {element.value?.map((el: any, idx: number) => (
                <SubmodelElementRenderer key={idx} element={el} />
            ))}
        </Box>
    );
}
