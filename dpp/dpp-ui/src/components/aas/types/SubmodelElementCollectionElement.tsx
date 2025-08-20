import { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Collapse
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SubmodelElementRenderer from "../SubmodelElementRenderer";

export default function SubmodelElementCollectionComponentElement({ element }: { element: any }) {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
        <Box
            sx={{
                mb: 2,
                border: "1px dashed #999",
                borderRadius: 1,
                backgroundColor: "#f4f4f4"
            }}
        >
            {/* Header – klickbar */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    cursor: "pointer",
                    px: 2,
                    py: 1,
                    margin: 0.5,
                    "&:hover": {
                        backgroundColor: "#e4e4e4",
                        borderTopLeftRadius: 15,
                        borderTopRightRadius: 15,
                        borderBottomLeftRadius: 15,
                        borderBottomRightRadius: 15,
                        margin: 0.5
                    }
                }}
                onClick={toggleOpen}
            >
                <Typography variant="subtitle1" fontWeight="bold">
                    {element.idShort}
                </Typography>
                <IconButton size="small" onClick={toggleOpen}>
                    {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            {/* Body – collapsible */}
            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 8, pr: 2, pb: 2 }}>
                    {element.description?.map((d: any, i: number) => (
                        <Typography key={i} variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {`${d.language}: ${d.text}`}
                        </Typography>
                    ))}

                    {element.value?.map((child: any, idx: number) => (
                        <Box
                            key={idx}
                            sx={{
                                backgroundColor: "#fff",
                                borderRadius: 1,
                                mb: 1,
                                p: 1,
                                boxShadow: 1
                            }}
                        >
                            <SubmodelElementRenderer element={child} />
                        </Box>
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
}
