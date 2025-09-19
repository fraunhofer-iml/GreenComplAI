/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto, FileDto, ProductDto } from '@ap2/api-interfaces';
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
export class SubmoduleCreationService {
  createSubmodules(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): DPPSubmodules {
    return {
      productIdentification: this.createProductIdentificationSubmodule(product),
      legalCompliance: this.createLegalComplianceSubmodule(
        product,
        uploadedFiles
      ),
      materialComposition: this.createMaterialCompositionSubmodule(product),
      packaging: this.createPackagingSubmodule(product),
      circularProperties: this.createCircularPropertiesSubmodule(
        product,
        uploadedFiles
      ),
      esrSynergies: this.createESRSynergiesSubmodule(product, uploadedFiles),
      usagePhase: this.createUsagePhaseSubmodule(product, uploadedFiles),
    };
  }

  private createProductIdentificationSubmodule(
    product: ProductDto
  ): ProductIdentificationSubmodule {
    return {
      id: `${product.productId}:product_identification`,
      name: 'Produktidentifikation',
      description: 'Eindeutige Identifikation und Zuordnung des Produkts',
      uniqueProductIdentifier: product.productId || product.id,
      gtin: product.gtin,
      taricCode: product.taricCode,
      supplier: product.supplier
        ? {
            name: product.supplier.name,
            email: product.supplier.email,
            phone: product.supplier.phone,
            address: this.buildAddressString(product.supplier.addresses[0]),
          }
        : undefined,
      importer: product.importerName
        ? {
            name: product.importerName,
            email: product.importerEmail,
            phone: product.importerPhone,
            address: product.importerAddress,
          }
        : undefined,
    };
  }

  private buildAddressString(address: AddressDto): string {
    return `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`;
  }

  private createLegalComplianceSubmodule(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): LegalComplianceSubmodule {
    const certificates: string[] = [];
    const technicalDocuments: string[] = [];
    const legalDocuments: string[] = [];
    const safetyInformation: string[] = [];

    uploadedFiles.forEach((file) => {
      switch (file.type) {
        case 'CERTIFICATE':
          certificates.push(file.path);
          break;
        case 'TECHNICAL_DOCUMENTATION':
          technicalDocuments.push(file.path);
          break;
        case 'LEGAL_DOCUMENTS':
          legalDocuments.push(file.path);
          break;
        case 'SAFETY_INFORMATION':
          safetyInformation.push(file.path);
          break;
      }
    });

    return {
      id: `${product.productId}:legal_compliance`,
      name: 'Rechts- & Konformitätsdaten',
      description:
        'Technische Dokumentation, Zertifikate und Sicherheitsinformationen',
      technicalDocumentation: {
        certificates,
        technicalDocuments,
        legalDocuments,
      },
      safetyInformation:
        safetyInformation.length > 0 ? safetyInformation : undefined,
    };
  }

  private createMaterialCompositionSubmodule(
    product: ProductDto
  ): MaterialCompositionSubmodule {
    const materials =
      product.materials?.map(([material, percentage, renewable, primary]) => ({
        name: material.name,
        weight: (product.weight * percentage) / 100,
        percentage,
        isRenewable: renewable,
        isPrimary: primary,
      })) || [];

    const criticalRawMaterials =
      product.criticalRawMaterials?.map(([material, percentage]) => ({
        name: material.name,
        weight: (product.weight * percentage) / 100,
        percentage,
        isCritical: true,
      })) || [];

    return {
      id: `${product.productId}:material_composition`,
      name: 'Materialzusammensetzung (Inflows)',
      description:
        'Detaillierte Aufschlüsselung der Materialkomponenten und deren Eigenschaften',
      totalWeight: product.weight || 0,
      materials: [...materials, ...criticalRawMaterials],
    };
  }

  private createPackagingSubmodule(product: ProductDto): PackagingSubmodule {
    const packagingMaterials =
      product.packagings?.map(([packaging, amount]) => ({
        name: packaging.name,
        weight: packaging.weight * amount,
        isRenewable: packaging.materials?.some(
          ([, , renewable]) => renewable === true
        ),
        isPrimary: packaging.materials?.some(
          ([, , , primary]) => primary === true
        ),
      })) || [];

    const totalWeight = packagingMaterials.reduce(
      (sum, pkg) => sum + pkg.weight,
      0
    );

    return {
      id: `${product.productId}:packaging`,
      name: 'Verpackung',
      description: 'Verpackungsmaterialien und deren Eigenschaften',
      totalWeight,
      packagingMaterials,
    };
  }

  private createCircularPropertiesSubmodule(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): CircularPropertiesSubmodule {
    const concerningSubstances =
      product.criticalRawMaterials?.map(([material]) => material.name) || [];

    const disassemblyInstructions: string[] = [];
    uploadedFiles.forEach((file) => {
      if (file.type === 'INSTRUCTIONS' && file.path?.includes('demontage')) {
        disassemblyInstructions.push(file.path);
      }
    });

    return {
      id: `${product.productId}:circular_properties`,
      name: 'Kreislaufeigenschaften & End-of-Life',
      description:
        'Informationen zur Kreislauffähigkeit und End-of-Life-Behandlung',
      concerningSubstances:
        concerningSubstances.length > 0 ? concerningSubstances : undefined,
      disassemblyInstructions:
        disassemblyInstructions.length > 0
          ? disassemblyInstructions
          : undefined,
      repairabilityScore: product.reparability,
    };
  }

  private createESRSynergiesSubmodule(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): ESRSynergiesSubmodule {
    const socialAspects: string[] = [];
    uploadedFiles.forEach((file) => {
      if (file.type === 'CERTIFICATE' && file.path?.includes('social')) {
        socialAspects.push(file.path);
      }
    });

    return {
      id: `${product.productId}:esr_synergies`,
      name: 'Synergien mit anderen ESRS',
      description:
        'Verknüpfungen mit anderen ESRS-Bereichen wie Klima, Wasser und soziale Aspekte',
      productCarbonFootprint: product.productCarbonFootprint,
      waterFootprint: product.waterUsed,
      socialAspects: socialAspects.length > 0 ? socialAspects : undefined,
    };
  }

  private createUsagePhaseSubmodule(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): UsagePhaseSubmodule {
    const usageInstructions: string[] = [];
    uploadedFiles.forEach((file) => {
      if (
        file.type === 'INSTRUCTIONS' &&
        (file.path?.includes('bedienung') || file.path?.includes('wartung'))
      ) {
        usageInstructions.push(file.path);
      }
    });

    return {
      id: `${product.productId}:usage_phase`,
      name: 'Nutzungsphase & Verbraucherinformation',
      description:
        'Anleitungen zur ordnungsgemäßen Nutzung, Pflege und Wartung',
      usageInstructions:
        usageInstructions.length > 0 ? usageInstructions : undefined,
    };
  }
}
