import type {
	CreateDataDictionaryEntryInput,
	CreateEconomicOperatorInput,
	CreateFacilityInput,
	CreateProductInput,
	DataDictionaryEntryResponse,
	DataDictionaryRepositoryResponse,
	DataValueType,
	EconomicOperatorResponse,
	EconomicOperatorRole,
	EsrsProfileApplicationResponse,
	EsrsProfilesResponse,
	FacilityResponse,
	FacilityType,
	ProductIdentifierInput,
	ProductIdentifierType,
	ProductLifecycleStatus,
	ProductResponse,
	TranslatableString,
	Visibility,
} from "@dpp/schemas";

import { apiRequest } from "#/features/api/client";

// Derived from the API's response schemas. `DictionaryEntryCategory` stays
// below them: the categories are a UI-side grouping the API does not know
// about.
export type { TranslatableString };
export type EconomicOperator = EconomicOperatorResponse;
export type DictionaryRepository = DataDictionaryRepositoryResponse;
export type DictionaryEntry = DataDictionaryEntryResponse;
export type Product = ProductResponse;
export type EsrsProfile = EsrsProfilesResponse["profiles"][number];
export type EsrsProfileConflict =
	EsrsProfileApplicationResponse["conflicts"][number];
export type ProductIdentifier = ProductIdentifierInput;
export type Facility = FacilityResponse;
export type {
	EconomicOperatorRole,
	FacilityType,
	ProductIdentifierType,
	ProductLifecycleStatus,
};

// Labels for facility types: the API returns the key, the UI needs a word.
// A complete Record table so a new type breaks the build instead of silently
// showing up as a raw key.
export const facilityTypeLabels: Record<FacilityType, string> = {
	assembly: "Montage",
	manufacturing: "Fertigung",
	other: "Sonstiges",
	recycling: "Recycling",
	repair: "Reparatur",
	testing: "Prüfung",
	warehouse: "Lager",
};
export const facilityTypes = Object.keys(facilityTypeLabels) as FacilityType[];

export const identifierTypeLabels: Record<ProductIdentifierType, string> = {
	batch: "Charge",
	gtin: "GTIN",
	model: "Modell",
	other: "Sonstige",
	serialNumber: "Seriennummer",
	sku: "SKU",
};
export const identifierTypes = Object.keys(
	identifierTypeLabels,
) as ProductIdentifierType[];

export const operatorRoleLabels: Record<EconomicOperatorRole, string> = {
	authority: "Behörde",
	authorizedRepresentative: "Bevollmächtigter",
	distributor: "Händler",
	importer: "Importeur",
	manufacturer: "Hersteller",
	recycler: "Recycler",
	serviceProvider: "Dienstleister",
};
export const operatorRoles = Object.keys(
	operatorRoleLabels,
) as EconomicOperatorRole[];

// The granularity a passport is issued at. The API keeps the field an open
// string, so this is what the interface offers, not what the contract allows.
export const dppGranularityLabels: Record<string, string> = {
	batch: "Charge",
	item: "Einzelstück",
	model: "Modell",
};

export const productLifecycleLabels: Record<ProductLifecycleStatus, string> = {
	active: "Aktiv",
	concept: "Konzept",
	endOfLife: "Auslaufend",
	recalled: "Zurückgerufen",
};

export type DictionaryEntryCategory = {
	description: string;
	id: string;
	label: string;
};

export type CreateDictionaryEntryInput = CreateDataDictionaryEntryInput;

const fallbackEntryCategories: Record<string, DictionaryEntryCategory> = {
	productName: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	productModel: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	productCategory: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	gtin: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	serialNumber: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	batchNumber: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	manufacturingDate: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	countryOfOrigin: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	facilityId: {
		description: "Produktidentität, Herkunft und eindeutige Referenzen.",
		id: "identification",
		label: "Identifikation",
	},
	length: {
		description: "Physische Spezifikation des Produkts.",
		id: "dimensions",
		label: "Maße und Gewicht",
	},
	width: {
		description: "Physische Spezifikation des Produkts.",
		id: "dimensions",
		label: "Maße und Gewicht",
	},
	height: {
		description: "Physische Spezifikation des Produkts.",
		id: "dimensions",
		label: "Maße und Gewicht",
	},
	weight: {
		description: "Physische Spezifikation des Produkts.",
		id: "dimensions",
		label: "Maße und Gewicht",
	},
	frameMaterial: {
		description: "Materialzusammensetzung und relevante Stoffinformationen.",
		id: "materials",
		label: "Materialien",
	},
	surfaceTreatment: {
		description: "Materialzusammensetzung und relevante Stoffinformationen.",
		id: "materials",
		label: "Materialien",
	},
	hazardousSubstances: {
		description: "Materialzusammensetzung und relevante Stoffinformationen.",
		id: "materials",
		label: "Materialien",
	},
	recycledAluminiumShare: {
		description: "Umweltwirkung, Kreislauffähigkeit und Ressourcenverbrauch.",
		id: "sustainability",
		label: "Nachhaltigkeit",
	},
	recyclabilityRate: {
		description: "Umweltwirkung, Kreislauffähigkeit und Ressourcenverbrauch.",
		id: "sustainability",
		label: "Nachhaltigkeit",
	},
	carbonFootprint: {
		description: "Umweltwirkung, Kreislauffähigkeit und Ressourcenverbrauch.",
		id: "sustainability",
		label: "Nachhaltigkeit",
	},
	waterFootprint: {
		description: "Umweltwirkung, Kreislauffähigkeit und Ressourcenverbrauch.",
		id: "sustainability",
		label: "Nachhaltigkeit",
	},
	energyConsumptionProduction: {
		description: "Umweltwirkung, Kreislauffähigkeit und Ressourcenverbrauch.",
		id: "sustainability",
		label: "Nachhaltigkeit",
	},
	ceDeclaration: {
		description: "Nachweise, Normen und regulatorische Konformität.",
		id: "compliance",
		label: "Konformität",
	},
	reachCompliance: {
		description: "Nachweise, Normen und regulatorische Konformität.",
		id: "compliance",
		label: "Konformität",
	},
	rohsCompliance: {
		description: "Nachweise, Normen und regulatorische Konformität.",
		id: "compliance",
		label: "Konformität",
	},
	materialSafetySheet: {
		description: "Nachweise, Normen und regulatorische Konformität.",
		id: "compliance",
		label: "Konformität",
	},
	repairabilityScore: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	sparePartAvailabilityYears: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	warrantyMonths: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	manualDocument: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	repairManualDocument: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	explodedViewDocument: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	endOfLifeInstructions: {
		description: "Nutzung, Wartung, Reparatur und End-of-Life.",
		id: "service-repair",
		label: "Service und Reparatur",
	},
	batteryPassportId: {
		description: "Lieferkette, Verpackung und Beziehungen zu anderen Pässen.",
		id: "supply-chain",
		label: "Lieferkette und Beziehungen",
	},
	supplierBatch: {
		description: "Lieferkette, Verpackung und Beziehungen zu anderen Pässen.",
		id: "supply-chain",
		label: "Lieferkette und Beziehungen",
	},
	supplierName: {
		description: "Lieferkette, Verpackung und Beziehungen zu anderen Pässen.",
		id: "supply-chain",
		label: "Lieferkette und Beziehungen",
	},
	packagingType: {
		description: "Lieferkette, Verpackung und Beziehungen zu anderen Pässen.",
		id: "supply-chain",
		label: "Lieferkette und Beziehungen",
	},
	transportMode: {
		description: "Lieferkette, Verpackung und Beziehungen zu anderen Pässen.",
		id: "supply-chain",
		label: "Lieferkette und Beziehungen",
	},
};

// Option lists as complete Record tables instead of hand-maintained arrays:
// a new value type in the API breaks the build here instead of silently
// missing from the select field - which is exactly what happened, the API
// already knew "datetime" and "enum" before the create form did. Both forms
// (create and edit) now read the same table.
export const valueTypeLabels: Record<DataValueType, string> = {
	array: "array",
	boolean: "boolean",
	date: "date",
	datetime: "datetime",
	document: "document",
	enum: "enum",
	number: "number",
	object: "object",
	string: "string",
};
export const valueTypes = Object.keys(valueTypeLabels) as DataValueType[];

export const visibilityLabels: Record<Visibility, string> = {
	controlled: "Kontrolliert",
	public: "Öffentlich",
};
export const visibilityOptions = (
	Object.keys(visibilityLabels) as Visibility[]
).map((value) => ({
	label: visibilityLabels[value],
	value,
}));

export function label(value?: TranslatableString | null) {
	return value?.de ?? value?.en ?? Object.values(value ?? {})[0] ?? "Unbenannt";
}

// Deliberately takes only what is actually read: the same entry reaches this
// function from two responses - the catalogue list and the DPP view - which
// differ in their timestamps (the demo tenant has none). That has no effect
// on the category.
export function dictionaryEntryCategory(
	entry: Pick<DictionaryEntry, "entryKey" | "metadata">,
): DictionaryEntryCategory {
	const category = entry.metadata?.category;
	if (isCategoryMetadata(category)) {
		return {
			description:
				typeof category.description === "string" ? category.description : "",
			id: category.id,
			label: label(category.name),
		};
	}

	return (
		fallbackEntryCategories[entry.entryKey] ?? {
			description: "Einträge ohne explizite Überkategorie.",
			id: "uncategorized",
			label: "Default",
		}
	);
}

export function dictionaryRepositoryCategories(
	repository?: Pick<DictionaryRepository, "metadata"> | null,
): DictionaryEntryCategory[] {
	const categories = repository?.metadata?.categories;
	if (!Array.isArray(categories)) return [];

	return categories.filter(isCategoryMetadata).map((category) => ({
		description:
			typeof category.description === "string" ? category.description : "",
		id: category.id,
		label: label(category.name),
	}));
}

function isCategoryMetadata(
	value: unknown,
): value is { description?: string; id: string; name: TranslatableString } {
	return Boolean(
		value &&
			typeof value === "object" &&
			"id" in value &&
			"name" in value &&
			typeof (value as { id?: unknown }).id === "string",
	);
}

export async function listProducts() {
	return (await apiRequest<{ products: Product[] }>("/products")).products;
}

export async function getProduct(productId: string) {
	return (
		await apiRequest<{ product: Product }>(
			`/products/${encodeURIComponent(productId)}`,
		)
	).product;
}

export async function createProduct(body: CreateProductInput) {
	return (
		await apiRequest<{ product: Product }>("/products", {
			body,
			method: "POST",
		})
	).product;
}

export async function patchProduct(productId: string, body: Partial<Product>) {
	return (
		await apiRequest<{ product: Product }>(
			`/products/${encodeURIComponent(productId)}`,
			{
				body,
				method: "PATCH",
			},
		)
	).product;
}

export async function listFacilities() {
	return (await apiRequest<{ facilities: Facility[] }>("/facilities"))
		.facilities;
}

export async function getFacility(facilityId: string) {
	return (
		await apiRequest<{ facility: Facility }>(
			`/facilities/${encodeURIComponent(facilityId)}`,
		)
	).facility;
}

export async function createFacility(body: CreateFacilityInput) {
	return (
		await apiRequest<{ facility: Facility }>("/facilities", {
			body,
			method: "POST",
		})
	).facility;
}

export async function patchFacility(
	facilityId: string,
	body: Partial<Facility>,
) {
	return (
		await apiRequest<{ facility: Facility }>(
			`/facilities/${encodeURIComponent(facilityId)}`,
			{
				body,
				method: "PATCH",
			},
		)
	).facility;
}

export async function createEconomicOperator(
	body: CreateEconomicOperatorInput,
) {
	return (
		await apiRequest<{ economicOperator: EconomicOperator }>(
			"/economic-operators",
			{
				body,
				method: "POST",
			},
		)
	).economicOperator;
}

export async function getEsrsProfiles(repositoryKey: string) {
	return (
		await apiRequest<{ esrs: EsrsProfilesResponse }>(
			`/data-dictionary-repositories/${encodeURIComponent(repositoryKey)}/esrs-profiles`,
		)
	).esrs;
}

export async function setEsrsProfiles(
	repositoryKey: string,
	profileKeys: string[],
) {
	return (
		await apiRequest<{ result: EsrsProfileApplicationResponse }>(
			`/data-dictionary-repositories/${encodeURIComponent(repositoryKey)}/esrs-profiles`,
			{ body: { profileKeys }, method: "PUT" },
		)
	).result;
}

export async function listEconomicOperators() {
	return (
		await apiRequest<{ economicOperators: EconomicOperator[] }>(
			"/economic-operators",
		)
	).economicOperators;
}

export async function getEconomicOperator(operatorId: string) {
	return (
		await apiRequest<{ economicOperator: EconomicOperator }>(
			`/economic-operators/${encodeURIComponent(operatorId)}`,
		)
	).economicOperator;
}

export async function patchEconomicOperator(
	operatorId: string,
	body: Partial<EconomicOperator>,
) {
	return (
		await apiRequest<{ economicOperator: EconomicOperator }>(
			`/economic-operators/${encodeURIComponent(operatorId)}`,
			{
				body,
				method: "PATCH",
			},
		)
	).economicOperator;
}

export async function listDictionaryRepositories() {
	return (
		await apiRequest<{ repositories: DictionaryRepository[] }>(
			"/data-dictionary-repositories",
		)
	).repositories;
}

export async function getDictionaryRepository(repositoryKey: string) {
	return (
		await apiRequest<{ repository: DictionaryRepository }>(
			`/data-dictionary-repositories/${encodeURIComponent(repositoryKey)}`,
		)
	).repository;
}

export async function patchDictionaryRepository(
	repositoryKey: string,
	body: Partial<DictionaryRepository>,
) {
	return (
		await apiRequest<{ repository: DictionaryRepository }>(
			`/data-dictionary-repositories/${encodeURIComponent(repositoryKey)}`,
			{ body, method: "PATCH" },
		)
	).repository;
}

// Every entry call names its dictionary. An entryKey alone stopped identifying
// one entry when dictionaries became versioned (G65): the key exists once per
// version, and two dictionaries may share it.
function entriesPath(repositoryKey: string) {
	return `/data-dictionary-repositories/${encodeURIComponent(repositoryKey)}/entries`;
}

export async function listDictionaryEntriesByRepository(repositoryKey: string) {
	return (
		await apiRequest<{ entries: DictionaryEntry[] }>(entriesPath(repositoryKey))
	).entries;
}

export async function getDictionaryEntry(
	repositoryKey: string,
	entryKey: string,
) {
	return (
		await apiRequest<{ entry: DictionaryEntry }>(
			`${entriesPath(repositoryKey)}/${encodeURIComponent(entryKey)}`,
		)
	).entry;
}

export async function patchDictionaryEntry(
	repositoryKey: string,
	entryKey: string,
	body: Partial<DictionaryEntry>,
) {
	return (
		await apiRequest<{ entry: DictionaryEntry }>(
			`${entriesPath(repositoryKey)}/${encodeURIComponent(entryKey)}`,
			{ body, method: "PATCH" },
		)
	).entry;
}

export async function createDictionaryEntry(
	repositoryKey: string,
	body: CreateDictionaryEntryInput,
) {
	return (
		await apiRequest<{ entry: DictionaryEntry }>(entriesPath(repositoryKey), {
			body,
			method: "POST",
		})
	).entry;
}
