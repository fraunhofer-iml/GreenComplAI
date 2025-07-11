// ====================
// Base Types
// ====================

export interface LangString {
    language: string;
    text: string;
}

export interface IdentifierKeyValuePair {
    name: string;
    value: string;
}

export interface Reference {
    type: 'GlobalReference' | 'ModelReference';
    keys: Key[];
}

export interface Key {
    type: string; // E.g. "Submodel", "Property", "ConceptDescription"
    value: string;
    idType: 'IRI' | 'URI' | 'Custom' | 'Fragment';
    local: boolean;
}

export interface Qualifier {
    type: string;
    valueType: string;
    value: string;
    semanticId?: Reference;
}

export interface EmbeddedDataSpecification {
    dataSpecification: Reference;
    dataSpecificationContent: object;
}

// ====================
// Asset Administration Shell (AAS)
// ====================

export interface AssetAdministrationShell {
    id: string;
    idShort: string;
    description?: LangString[];
    category?: string;
    assetInformation: AssetInformation;
    submodels: Reference[];
    derivedFrom?: Reference;
    specificAssetIds?: IdentifierKeyValuePair[];
    qualifiers?: Qualifier[];
    embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

// ====================
// Asset Information
// ====================

export interface AssetInformation {
    assetKind: 'Type' | 'Instance';
    globalAssetId: string;
    specificAssetIds?: IdentifierKeyValuePair[];
    defaultThumbnail?: FileElement;
}

// ====================
// Submodel
// ====================

export interface Submodel {
    id: string;
    idShort: string;
    description?: LangString[];
    category?: string;
    semanticId?: Reference;
    qualifiers?: Qualifier[];
    kind?: 'Instance' | 'Type';
    submodelElements: SubmodelElement[];
    embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

// ====================
// Submodel Elements (Union Type)
// ====================

export type SubmodelElement =
    | Property
    | MultiLanguageProperty
    | Range
    | FileElement
    | BlobElement
    | ReferenceElement
    | RelationshipElement
    | SubmodelElementCollection
    | Operation
    | Capability;

// ====================
// Common Element Properties
// ====================

interface BaseElement {
    idShort: string;
    description?: LangString[];
    category?: string;
    semanticId?: Reference;
    qualifiers?: Qualifier[];
    kind?: 'Instance' | 'Type';
    embeddedDataSpecifications?: EmbeddedDataSpecification[];
    modelType: string;
}

// ====================
// Submodel Element Types
// ====================

export interface Property extends BaseElement {
    modelType: 'Property';
    valueType: string;
    value: string | number | boolean;
}

export interface MultiLanguageProperty extends BaseElement {
    modelType: 'MultiLanguageProperty';
    value: LangString[];
}

export interface Range extends BaseElement {
    modelType: 'Range';
    valueType: string;
    min: string | number;
    max: string | number;
}

export interface FileElement extends BaseElement {
    modelType: 'File';
    mimeType: string;
    value: string; // Path to file
}

export interface BlobElement extends BaseElement {
    modelType: 'Blob';
    mimeType: string;
    value: string; // Base64 encoded data
}

export interface ReferenceElement extends BaseElement {
    modelType: 'ReferenceElement';
    value: Reference;
}

export interface RelationshipElement extends BaseElement {
    modelType: 'RelationshipElement';
    first: Reference;
    second: Reference;
}

export interface SubmodelElementCollection extends BaseElement {
    modelType: 'SubmodelElementCollection';
    value: SubmodelElement[];
    ordered: boolean;
    allowDuplicates: boolean;
}

export interface Operation extends BaseElement {
    modelType: 'Operation';
    inputVariables?: OperationVariable[];
    outputVariables?: OperationVariable[];
    inoutputVariables?: OperationVariable[];
}

export interface OperationVariable {
    value: SubmodelElement;
}

export interface Capability extends BaseElement {
    modelType: 'Capability';
}
