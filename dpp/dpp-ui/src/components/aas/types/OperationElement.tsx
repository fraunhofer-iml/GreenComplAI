import { Box, Typography } from "@mui/material";
import SubmodelElementRenderer from "../SubmodelElementRenderer";

export default function OperationElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px dashed #0077cc", borderRadius: 1 }}>
            <Typography variant="subtitle2">{element.idShort}</Typography>
            <Typography variant="body2">Operation</Typography>

            {["inputVariables", "outputVariables", "inoutputVariables"].map((key) =>
                element[key]?.length ? (
                    <Box key={key} sx={{ ml: 2 }}>
                        <Typography variant="body2">{key}:</Typography>
                        {element[key].map((opVar: any, idx: number) => (
                            <SubmodelElementRenderer key={idx} element={opVar.value} />
                        ))}
                    </Box>
                ) : null
            )}
        </Box>
    );
}
