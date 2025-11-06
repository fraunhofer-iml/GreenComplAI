/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  DataTypeDefXsd,
  ISubmodelElement,
  Key,
  KeyTypes,
  LangStringNameType,
  LangStringTextType,
  ModelType,
  Property,
  Reference,
  ReferenceTypes,
  Submodel,
  SubmodelElementCollection,
} from '@aas-core-works/aas-core3.0-typescript/types';
import {
  AasRepositoryClient,
  Configuration,
  SubmodelRepositoryClient,
} from 'basyx-typescript-sdk';
import { Injectable } from '@nestjs/common';
import {
  CircularPropertiesSubmodule,
  DPPSubmodules,
  ESRSynergiesSubmodule,
  LegalComplianceSubmodule,
  MaterialCompositionSubmodule,
  PackagingSubmodule,
  ProductIdentificationSubmodule,
  UsagePhaseSubmodule,
} from './submodule.types';

@Injectable()
export class AasSubmoduleService {
  constructor(
    private readonly client: AasRepositoryClient,
    private readonly configuration: Configuration,
    private readonly submodelRepositoryClient: SubmodelRepositoryClient
  ) {}

  async createAndAttachSubmodules(
    aas: AssetAdministrationShell,
    submodules: DPPSubmodules
  ): Promise<void> {
    const referencePromises = [
      this.createProductIdentificationSubmodel(
        aas,
        submodules.productIdentification
      ),
      this.createLegalComplianceSubmodel(aas, submodules.legalCompliance),
      this.createMaterialCompositionSubmodel(
        aas,
        submodules.materialComposition
      ),
      this.createPackagingSubmodel(aas, submodules.packaging),
      this.createCircularPropertiesSubmodel(aas, submodules.circularProperties),
      this.createESRSynergiesSubmodel(aas, submodules.esrSynergies),
      this.createUsagePhaseSubmodel(aas, submodules.usagePhase),
    ];

    const submodelReferences = await Promise.all(referencePromises);

    aas.submodels = [...(aas.submodels ?? []), ...submodelReferences];

    const aasResult = await this.client.putAssetAdministrationShellById({
      configuration: this.configuration,
      aasIdentifier: aas.id,
      assetAdministrationShell: aas,
    });

    if (aasResult.success === false) {
      throw new Error(
        `Error attaching submodels to AAS ${aas.id}: ${aasResult.error}`
      );
    }
  }

  private async createProductIdentificationSubmodel(
    aas: AssetAdministrationShell,
    submodule: ProductIdentificationSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [
      this.createProperty(
        'uniqueProductIdentifier',
        submodule.uniqueProductIdentifier,
        'Eindeutiger Produktidentifikator',
        'Eindeutiger Produktidentifikator'
      ),
      this.createProperty(
        'gtin',
        submodule.gtin,
        'Global Trade Item Number',
        'Global Trade Item Number'
      ),
      this.createProperty(
        'taricCode',
        submodule.taricCode,
        'TARIC-Code / Warennummer',
        'TARIC-Code / Warennummer'
      ),
    ];

    if (submodule.supplier) {
      const supplierCollection = this.createSubmodelElementCollection(
        'supplier',
        'Lieferant',
        [
          this.createProperty(
            'name',
            submodule.supplier.name,
            'Name des Lieferanten',
            'Name des Lieferanten'
          ),
          this.createProperty(
            'email',
            submodule.supplier.email,
            'E-Mail des Lieferanten',
            'E-Mail des Lieferanten'
          ),
          this.createProperty(
            'phone',
            submodule.supplier.phone,
            'Telefonnummer des Lieferanten',
            'Telefonnummer des Lieferanten'
          ),
          this.createProperty(
            'address',
            submodule.supplier.address,
            'Adresse des Lieferanten',
            'Adresse des Lieferanten'
          ),
        ]
      );
      elements.push(supplierCollection);
    }

    if (submodule.importer || submodule.supplier) {
      const importerCollection = this.createSubmodelElementCollection(
        'importer',
        'Importeur',
        [
          this.createProperty(
            'name',
            submodule.importerIsSupplier
              ? submodule.supplier?.name
              : submodule.importer?.name,
            'Name des Importeurs',
            'Name des Importeurs'
          ),
          this.createProperty(
            'email',
            submodule.importerIsSupplier
              ? submodule.supplier?.email
              : submodule.importer?.email,
            'E-Mail des Importeurs',
            'E-Mail des Importeurs'
          ),
          this.createProperty(
            'phone',
            submodule.importerIsSupplier
              ? submodule.supplier?.phone
              : submodule.importer?.phone,
            'Telefonnummer des Importeurs',
            'Telefonnummer des Importeurs'
          ),
          this.createProperty(
            'address',
            submodule.importerIsSupplier
              ? submodule.supplier?.address
              : submodule.importer?.address,
            'Adresse des Importeurs',
            'Adresse des Importeurs'
          ),
        ]
      );
      elements.push(importerCollection);
    }

    const submodel = this.buildSubmodel(
      aas,
      'product_identification',
      'product_identification',
      'product_identification',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createLegalComplianceSubmodel(
    aas: AssetAdministrationShell,
    submodule: LegalComplianceSubmodule
  ): Promise<Reference> {
    const technicalDocCollection = this.createSubmodelElementCollection(
      'technicalDocumentation',
      'Technische Dokumentation',
      [
        this.createStringArrayCollection(
          'certificates',
          'Zertifikate & Nachweise',
          submodule.technicalDocumentation.certificates,
          'Zertifikat',
          'Zertifikat'
        ),
        this.createStringArrayCollection(
          'technicalDocuments',
          'Technische Unterlagen',
          submodule.technicalDocumentation.technicalDocuments,
          'Technische Unterlagen',
          'Technische Unterlagen'
        ),
        this.createStringArrayCollection(
          'legalDocuments',
          'Rechtliche Dokumente',
          submodule.technicalDocumentation.legalDocuments,
          'Rechtliche Dokumente',
          'Rechtliche Dokumente'
        ),
      ]
    );

    const elements: ISubmodelElement[] = [technicalDocCollection];

    if (submodule.safetyInformation) {
      elements.push(
        this.createSubmodelElementCollection(
          'safetyInformation',
          'Sicherheitsinformationen & Warnhinweise',
          submodule.safetyInformation.map((information) =>
            this.createProperty(
              information,
              information,
              'Sicherheitsinformationen & Warnhinweise',
              'Sicherheitsinformationen & Warnhinweise'
            )
          )
        )
      );
    }

    const submodel = this.buildSubmodel(
      aas,
      'legal_compliance',
      'legal_compliance',
      'legal_compliance',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createMaterialCompositionSubmodel(
    aas: AssetAdministrationShell,
    submodule: MaterialCompositionSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [
      this.createProperty(
        'totalWeight',
        submodule.totalWeight.toString(),
        'Gesamtgewicht des Produkts in kg',
        'Gesamtgewicht in kg'
      ),
    ];

    submodule.materials.forEach((material, index) => {
      const materialCollection = this.createSubmodelElementCollection(
        `material_${index}`,
        material.name,
        [
          this.createProperty(
            'weight',
            material.weight.toString(),
            'Gewicht in kg',
            'Gewicht in kg'
          ),
          this.createProperty(
            'percentage',
            material.percentage.toString(),
            'Prozentsatz',
            'Prozentsatz'
          ),
          this.createProperty(
            'isRenewable',
            material.isRenewable?.toString() || 'false',
            'Erneuerbar / nicht-erneuerbar',
            'Erneuerbar / nicht-erneuerbar'
          ),
          this.createProperty(
            'isPrimary',
            material.isPrimary?.toString() || 'false',
            'Primär- / Sekundärrohstoff',
            'Primär- / Sekundärrohstoff'
          ),
          this.createProperty(
            'isCritical',
            material.isCritical?.toString() || 'false',
            'Kritischer Rohstoff',
            'Kritischer Rohstoff'
          ),
        ]
      );
      elements.push(materialCollection);
    });

    const submodel = this.buildSubmodel(
      aas,
      'material_composition',
      'material_composition',
      'material_composition',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createPackagingSubmodel(
    aas: AssetAdministrationShell,
    submodule: PackagingSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [
      this.createProperty(
        'totalWeight',
        submodule.totalWeight.toString(),
        'Gesamtgewicht der Verpackung in kg',
        'Gesamtgewicht der Verpackung in kg'
      ),
    ];

    submodule.packagingMaterials.forEach((material, index) => {
      const materialCollection = this.createSubmodelElementCollection(
        `packagingMaterial_${index}`,
        material.name,
        [
          this.createProperty(
            'weight',
            material.weight.toString(),
            'Gewicht in kg',
            'Gewicht in kg'
          ),
          this.createProperty(
            'isRenewable',
            material.isRenewable?.toString() || 'false',
            'Erneuerbar / nicht-erneuerbar',
            'Erneuerbar / nicht-erneuerbar'
          ),
          this.createProperty(
            'isPrimary',
            material.isPrimary?.toString() || 'false',
            'Primär- / Sekundärrohstoff',
            'Primär- / Sekundärrohstoff'
          ),
        ]
      );
      elements.push(materialCollection);
    });

    const submodel = this.buildSubmodel(
      aas,
      'packaging',
      'packaging',
      'packaging',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createCircularPropertiesSubmodel(
    aas: AssetAdministrationShell,
    submodule: CircularPropertiesSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [];

    if (submodule.concerningSubstances) {
      elements.push(
        this.createProperty(
          'concerningSubstances',
          JSON.stringify(submodule.concerningSubstances),
          'Besorgniserregende Stoffe',
          'Besorgniserregende Stoffe'
        )
      );
    }

    if (submodule.disassemblyInstructions) {
      elements.push(
        this.createProperty(
          'disassemblyInstructions',
          JSON.stringify(submodule.disassemblyInstructions),
          'Demontage- und Trennungsanleitungen',
          'Demontage- und Trennungsanleitungen'
        )
      );
    }

    if (submodule.repairabilityScore) {
      elements.push(
        this.createProperty(
          'repairabilityScore',
          submodule.repairabilityScore.toString(),
          'Reparierbarkeits-Score',
          'Reparierbarkeits-Score'
        )
      );
    }

    const submodel = this.buildSubmodel(
      aas,
      'circular_properties',
      'circular_properties',
      'circular_properties',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createESRSynergiesSubmodel(
    aas: AssetAdministrationShell,
    submodule: ESRSynergiesSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [];

    if (submodule.productCarbonFootprint) {
      elements.push(
        this.createProperty(
          'productCarbonFootprint',
          submodule.productCarbonFootprint.toString(),
          'Product Carbon Footprint in kgCO2e',
          'Product Carbon Footprint in kgCO2e'
        )
      );
    }

    if (submodule.waterFootprint) {
      elements.push(
        this.createProperty(
          'waterFootprint',
          submodule.waterFootprint.toString(),
          'Wasser-Fußabdruck in l',
          'Wasser-Fußabdruck in l'
        )
      );
    }

    if (submodule.socialAspects) {
      elements.push(
        this.createProperty(
          'socialAspects',
          JSON.stringify(submodule.socialAspects),
          'Soziale Aspekte in der Herstellung',
          'Soziale Aspekte in der Herstellung'
        )
      );
    }

    const submodel = this.buildSubmodel(
      aas,
      'esr_synergies',
      'esr_synergies',
      'esr_synergies',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private async createUsagePhaseSubmodel(
    aas: AssetAdministrationShell,
    submodule: UsagePhaseSubmodule
  ): Promise<Reference> {
    const elements: ISubmodelElement[] = [];

    if (submodule.usageInstructions) {
      elements.push(
        this.createProperty(
          'usageInstructions',
          JSON.stringify(submodule.usageInstructions),
          'Nutzungs-, Pflege- und Wartungsanleitungen',
          'Nutzungs-, Pflege- und Wartungsanleitungen'
        )
      );
    }

    const submodel = this.buildSubmodel(
      aas,
      'usage_phase',
      'usage_phase',
      'usage_phase',
      submodule.name,
      submodule.description,
      elements
    );

    return await this.attachSubmodelToAAS(aas, submodel);
  }

  private createProperty(
    idShort: string,
    value: string,
    description: string,
    displayName: string
  ): Property {
    const property = new Property(DataTypeDefXsd.String);
    property.idShort = idShort;
    property.value = value;
    property.description = [new LangStringTextType('de', description)];
    property.displayName = [new LangStringNameType('de', displayName)];
    return property;
  }

  private createSubmodelElementCollection(
    idShort: string,
    name: string,
    elements: ISubmodelElement[]
  ): SubmodelElementCollection {
    const collection = new SubmodelElementCollection();
    collection.idShort = idShort;
    collection.displayName = [new LangStringNameType('de', name)];
    collection.value = elements;
    return collection;
  }

  private createStringArrayCollection(
    idShort: string,
    displayName: string,
    values: string[],
    elementDisplayName: string,
    elementDescription: string
  ): SubmodelElementCollection {
    return this.createSubmodelElementCollection(
      idShort,
      displayName,
      values.map((value) =>
        this.createProperty(
          value,
          value,
          elementDescription,
          elementDisplayName
        )
      )
    );
  }

  private buildSubmodel(
    aas: AssetAdministrationShell,
    idSuffix: string,
    idShort: string,
    category: string,
    name: string,
    description: string,
    elements: ISubmodelElement[]
  ): Submodel {
    const submodel = new Submodel(`${aas.id}:${idSuffix}`);
    submodel.modelType = () => ModelType.Submodel;
    submodel.idShort = idShort;
    submodel.category = category;
    submodel.displayName = [new LangStringNameType('de', name)];
    submodel.description = [new LangStringTextType('de', description)];
    submodel.submodelElements = elements;
    return submodel;
  }

  private async attachSubmodelToAAS(
    aas: AssetAdministrationShell,
    submodel: Submodel
  ): Promise<Reference> {
    const submodelResult = await this.submodelRepositoryClient.postSubmodel({
      configuration: this.configuration,
      submodel,
    });

    if (submodelResult.success === false) {
      throw new Error(
        `Error creating submodel ${submodel.id}: ${submodelResult.error}`
      );
    }

    const submodelReference = new Reference(ReferenceTypes.ModelReference, [
      new Key(KeyTypes.Submodel, submodelResult.data.id),
    ]);

    return submodelReference;
  }
}
