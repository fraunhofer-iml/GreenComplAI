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
    "RelationshipElement",
    "AssetAdministrationShell" // 🔧 Hinzugefügt
]);

const Key = z.object({
    type: KeyType,
    value: z.string()
});

const ReferenceType = z.enum(["ModelReference", "ExternalReference"]); // 🔧

const Reference = z.object({
    type: ReferenceType,
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
    value: z.string().optional()
});

// MultiLanguageProperty
const MultiLanguageProperty = SubmodelElementBase.extend({
    modelType: z.literal("MultiLanguageProperty"),
    value: z.array(LangString).optional()
});

// File
const File = SubmodelElementBase.extend({
    modelType: z.literal("File"),
    mimeType: z.string(),
    value: z.string().optional()
});

// Range
const Range = SubmodelElementBase.extend({
    modelType: z.literal("Range"),
    valueType: z.string(),
    min: z.string().optional(),
    max: z.string().optional()
});

// RelationshipElement
const RelationshipElement = SubmodelElementBase.extend({
    modelType: z.literal("RelationshipElement"),
    first: Reference,
    second: Reference
});

// 👉 SubmodelElementCollection muss vorher deklariert, aber später gefüllt werden
const SubmodelElementCollection = SubmodelElementBase.extend({
    modelType: z.literal("SubmodelElementCollection"),
    value: z.array(z.lazy(() => SubmodelElement)).optional()
});

// SubmodelElement Union
// 👉 Jetzt definierst du SubmodelElement mit lazy
// ⬇️ Jetzt mit allen Typen erweitern
const SubmodelElement: z.ZodType<any> = z.lazy(() =>
    z.discriminatedUnion("modelType", [
        Property,
        MultiLanguageProperty,
        File,
        Range,
        RelationshipElement,
        SubmodelElementCollection,
        Blob,
        Capability,
        AnnotatedRelationshipElement,
        Operation,
        SubmodelElementList
    ])
);

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
    modelType: z.literal("AssetAdministrationShell"), // 👉 BaSyx liefert das IMMER mit
    id: z.string(),
    idShort: z.string(),
    description: z.array(LangString).optional(),
    assetInformation: AssetInformation,
    submodels: z.array(Reference),
    derivedFrom: Reference.optional() // 👉 Das hattest du vorher auch, kann bei BaSyx vorkommen
});

// AAS Environment
export const AASEnvironment = z.object({
    assetAdministrationShells: z.array(AssetAdministrationShell),
    submodels: z.array(Submodel)
});

export const BaSyxAASResponse = z.object({
    paging_metadata: z.any().optional(),
    result: z.array(AssetAdministrationShell)
});

export type BaSyxAASResponseType = z.infer<typeof BaSyxAASResponse>;
export type AASEnvironmentObject = z.infer<typeof AASEnvironment>;
export type AAS = z.infer<typeof AssetAdministrationShell>;
export type Submodel = z.infer<typeof Submodel>;

// ⬇️ Blob
const Blob = SubmodelElementBase.extend({
    modelType: z.literal("Blob"),
    mimeType: z.string(),
    value: z.string().optional()
});

// ⬇️ Capability
const Capability = SubmodelElementBase.extend({
    modelType: z.literal("Capability")
});

// ⬇️ AnnotatedRelationshipElement
const AnnotatedRelationshipElement = SubmodelElementBase.extend({
    modelType: z.literal("AnnotatedRelationshipElement"),
    first: Reference,
    second: Reference,
    annotations: z.array(z.lazy(() => SubmodelElement))
});

// ⬇️ OperationVariable
const OperationVariable = z.object({
    value: z.lazy(() => SubmodelElement)
});

// ⬇️ Operation
const Operation = SubmodelElementBase.extend({
    modelType: z.literal("Operation"),
    inputVariables: z.array(OperationVariable).optional(),
    outputVariables: z.array(OperationVariable).optional(),
    inoutputVariables: z.array(OperationVariable).optional()
});

// ⬇️ SubmodelElementList
const SubmodelElementList = SubmodelElementBase.extend({
    modelType: z.literal("SubmodelElementList"),
    typeValueListElement: z.string(), // z.B. "Property"
    orderRelevant: z.boolean().optional(),
    valueTypeListElement: z.string().optional(),
    value: z.array(z.lazy(() => SubmodelElement)).optional()
});

