import { Box, Typography } from "@mui/material";
import SubmodelElementRenderer from "../SubmodelElementRenderer";

export default function AnnotatedRelationshipElement({ element }: { element: any }) {
    return (
        <Box sx={{ mb: 2, p: 1, border: "1px dashed #cc8800", borderRadius: 1 }}>
            <Typography variant="subtitle2">{element.idShort}</Typography>
            <Typography variant="body2">Annotation von:</Typography>
            <Typography variant="caption">Von: {element.first?.keys?.[0]?.value}</Typography><br />
            <Typography variant="caption">Nach: {element.second?.keys?.[0]?.value}</Typography>

            <Box sx={{ mt: 1, ml: 2 }}>
                <Typography variant="body2">Anmerkungen:</Typography>
                {element.annotations?.map((ann: any, idx: number) => (
                    <SubmodelElementRenderer key={idx} element={ann} />
                ))}
            </Box>
        </Box>
    );
}
