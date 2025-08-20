import { Box, Typography } from "@mui/material";
import { Submodel } from "../../data/AasZod";
import SubmodelElementRenderer from "./SubmodelElementRenderer";

export default function SubmodelPanel({ submodel }: { submodel: Submodel }) {
    return (
        <Box sx={{ mt: 1 }}>
            {submodel.description?.map((d, i) => (
                <>
                    {/*<Typography key={i} variant="body2">{`Language: ${d.language}`}</Typography>*/}
                    <Typography key={i} variant="body2">{`Description: ${d.text}`}</Typography>
                </>
            ))}
            <Box mt={2}>
                {submodel.submodelElements.map((el, idx) => (
                    <SubmodelElementRenderer key={idx} element={el} />
                ))}
            </Box>
        </Box>
    );
}
