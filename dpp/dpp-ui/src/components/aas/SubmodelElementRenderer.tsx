import { Box, Typography } from "@mui/material";
import {
    PropertyElement,
    MultiLanguagePropertyElement,
    FileElement,
    RangeElement,
    BlobElement,
    CapabilityElement,
    OperationElement,
    RelationshipElementComponent,
    AnnotatedRelationshipElementComponent,
    SubmodelElementCollectionComponent,
    SubmodelElementListComponent
} from "./types/index";

export default function SubmodelElementRenderer({ element }: { element: any }) {
    switch (element.modelType) {
        case "Property":
            return <PropertyElement element={element} />;

        case "MultiLanguageProperty":
            return <MultiLanguagePropertyElement element={element} />;

        case "File":
            return <FileElement element={element} />;

        case "Range":
            return <RangeElement element={element} />;

        case "Blob":
            return <BlobElement element={element} />;

        case "Capability":
            return <CapabilityElement element={element} />;

        case "Operation":
            return <OperationElement element={element} />;

        case "RelationshipElement":
            return <RelationshipElementComponent element={element} />;

        case "AnnotatedRelationshipElement":
            return <AnnotatedRelationshipElementComponent element={element} />;

        case "SubmodelElementCollection":
            return <SubmodelElementCollectionComponent element={element} />;

        case "SubmodelElementList":
            return <SubmodelElementListComponent element={element} />;

        default:
            return (
                <Box sx={{ mb: 2, p: 1, border: "1px dotted #ccc", borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Unbekannter Typ: {element.modelType}
                    </Typography>
                    <Typography variant="caption">
                        {element.idShort}
                    </Typography>
                </Box>
            );
    }
}