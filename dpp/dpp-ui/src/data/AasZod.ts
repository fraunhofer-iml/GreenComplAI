import { z } from "zod";

// Identifier Types
const IdentifierType = z.enum(["IRI", "IRDI", "Custom"]);

// Key and Reference
const KeyType = z.enum([
    "GlobalReference",
    "Submodel",
    "Property",
    "File",
    "MultiLanguageProperty",
    "Range",
    "RelationshipElement"
]);

const Key = z.object({
    type: KeyType,
    value: z.string()
});

const Reference = z.object({
    type: z.literal("ModelReference"),
    keys: z.array(Key)
});

// LangString for multi-language support
const LangString = z.object({
    language: z.string(),
    text: z.string()
});

// Base Interface for SubmodelElements
const SubmodelElementBase = z.object({
    idShort: z.string(),
    category: z.string().optional(),
    description: z.array(LangString).optional(),
    semanticId: Reference.optional(),
    kind: z.enum(["Instance", "Type"]).optional()
});

// Property
const Property = SubmodelElementBase.extend({
    modelType: z.literal("Property"),
    valueType: z.string(),
    value: z.string()
});

// MultiLanguageProperty
const MultiLanguageProperty = SubmodelElementBase.extend({
    modelType: z.literal("MultiLanguageProperty"),
    value: z.array(LangString)
});

// File
const File = SubmodelElementBase.extend({
    modelType: z.literal("File"),
    mimeType: z.string(),
    value: z.string()
});

// Range
const Range = SubmodelElementBase.extend({
    modelType: z.literal("Range"),
    valueType: z.string(),
    min: z.string(),
    max: z.string()
});

// RelationshipElement
const RelationshipElement = SubmodelElementBase.extend({
    modelType: z.literal("RelationshipElement"),
    first: Reference,
    second: Reference
});

// SubmodelElement Union
const SubmodelElement = z.discriminatedUnion("modelType", [
    Property,
    MultiLanguageProperty,
    File,
    Range,
    RelationshipElement
]);

// Submodel
export const Submodel = z.object({
    id: z.string(),
    idShort: z.string(),
    description: z.array(LangString).optional(),
    semanticId: Reference.optional(),
    submodelElements: z.array(SubmodelElement)
});

// AssetInformation
const AssetInformation = z.object({
    assetKind: z.enum(["Instance", "Type"]),
    globalAssetId: z.string(), // ⬅️ Korrigiert
    specificAssetIds: z.array(z.object({
        name: z.string(),
        value: z.string()
    })).optional()
});

// AAS
export const AssetAdministrationShell = z.object({
    id: z.string(),
    idShort: z.string(),
    description: z.array(LangString).optional(),
    assetInformation: AssetInformation,
    submodels: z.array(Reference)
});

// AAS Environment
export const AASEnvironment = z.object({
    assetAdministrationShells: z.array(AssetAdministrationShell),
    submodels: z.array(Submodel)
});

export type AASEnvironmentObject = z.infer<typeof AASEnvironment>;
export type AAS = z.infer<typeof AssetAdministrationShell>;
export type Submodel = z.infer<typeof Submodel>;