import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IdocUploadDto {
  @ApiProperty({ description: 'Raw SAP iDoc as XML string' })
  xml!: string;

  @ApiPropertyOptional({
    description:
      'Optional source identifier (e.g., system name) stored alongside created records',
    example: 'SAP-PRD',
  })
  source?: string;
}

export class IdocIngestResponse {
  @ApiProperty({ description: 'Number of products created or upserted' })
  productsProcessed!: number;

  @ApiProperty({ description: 'Number of companies created or upserted' })
  companiesProcessed!: number;

  @ApiProperty({
    description: 'IDs / externalIds of created products',
    type: [String],
  })
  productExternalIds!: string[];
}
