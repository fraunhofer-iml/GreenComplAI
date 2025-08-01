/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AddressCreateDto,
  AuthenticatedKCUser,
  AuthRoles,
  CompanyCreateDto,
  CompanyDto,
  getRealmRole,
  PaginatedData,
} from '@ap2/api-interfaces';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  private readonly logger: Logger = new Logger(CompaniesController.name);

  constructor(private readonly companyService: CompaniesService) {}

  @Post()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Create new Company for the current cuser.',
  })
  @ApiCreatedResponse({ description: 'Successfully created' })
  @ApiBody({
    type: CompanyCreateDto,
  })
  @ApiOkResponse({
    description: 'Created Company',
    type: CompanyDto,
  })
  async createCompany(
    @AuthenticatedUser() user: AuthenticatedKCUser,
    @Body() createCompanyDto: CompanyCreateDto
  ): Promise<CompanyDto> {
    return await this.companyService.createCompany({
      dto: createCompanyDto,
      userId: user.sub,
    });
  }

  @Post('associate')
  @ApiBearerAuth()
  @Roles({ roles: [getRealmRole(AuthRoles.BUYER)] })
  @ApiOperation({
    description: 'Create new associated Company.',
  })
  @ApiExtraModels(AddressCreateDto)
  @ApiCreatedResponse({ description: 'Successfully created', type: CompanyDto })
  async createAssociateCompany(
    @AuthenticatedUser() user: AuthenticatedKCUser,
    @Body() createCompanyDto: CompanyCreateDto
  ): Promise<CompanyDto> {
    return await this.companyService.createAssociatedCompany({
      dto: createCompanyDto,
      userId: user.sub,
    });
  }

  @Get()
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.BUYER),
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    ],
  })
  @ApiOperation({
    description:
      'Get all companies associated to the currently authenticated users company.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    examples: {
      noFilter: { value: null },
      name: { value: { name: { contains: 'GMBH' } } },
    },
  })
  @ApiQuery({
    name: 'sorting',
    required: false,
    examples: {
      noSorting: { value: null },
      name: { value: { name: 'asc' } },
    },
  })
  @ApiOkResponse({
    description:
      'Successfull Request: Return Paginated Companies associated to the user',
    type: PaginatedData<CompanyDto[]>,
  })
  async findAll(
    @AuthenticatedUser() user: AuthenticatedKCUser,
    @Query('filters') filters: string,
    @Query('sorting') sorting: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number
  ): Promise<PaginatedData<CompanyDto[]>> {
    return await this.companyService.findAllAssociatedCompanies({
      userId: user.sub,
      filters: filters,
      sorting: sorting,
      page: page,
      size: pageSize,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.BUYER),
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    ],
  })
  @ApiOperation({
    description: 'Get one company by id.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return company with id',
    type: CompanyDto,
  })
  findOne(@Param('id') id: string): Promise<CompanyDto> {
    return this.companyService.findOne({ id: id });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles({ roles: [getRealmRole(AuthRoles.BUYER)] })
  @ApiOperation({
    description: 'Update company.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated company with id',
    type: CompanyDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: CompanyCreateDto
  ): Promise<CompanyDto> {
    return this.companyService.update({ id: id, dto: dto });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles({ roles: [getRealmRole(AuthRoles.BUYER)] })
  @ApiOperation({
    description: 'Delete one company.',
  })
  @ApiOkResponse({
    description: 'Successfully removed Company',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.companyService.remove({ id: id });
  }

  @Get('user/own')
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.BUYER),
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    ],
  })
  @ApiOperation({
    description: 'Get one company by user id.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return company of authenticaed user',
    type: CompanyDto,
  })
  findOneByUserId(
    @AuthenticatedUser() user: AuthenticatedKCUser
  ): Promise<CompanyDto> {
    return this.companyService.findOneByUserId({ id: user.sub });
  }
}
