import { AmqpClientEnum, ProductMessagePatterns } from '@ap2/amqp';
import {
  AuthenticatedKCUser,
  FindAllProductsProps,
  FindProductByIdProps,
  PaginatedData,
  ProductDto,
  UpdateProductProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy,
    private readonly companiesService: CompaniesService
  ) {}

  async findAllForSupplier(
    props: FindAllProductsProps,
    user: AuthenticatedKCUser
  ): Promise<PaginatedData<Partial<ProductDto>>> {
    const supplierCompanyId = this.getCompanyIdByUserId(user.sub);

    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductDto>>(
        ProductMessagePatterns.READ_ALL_OF_SUPPLIER,
        {
          ...props,
          supplierCompanyId: supplierCompanyId,
        }
      )
    );
  }

  async findOneOfSupplier(
    props: FindProductByIdProps,
    user: AuthenticatedKCUser
  ): Promise<Partial<ProductDto>> {
    const supplierCompanyId = this.getCompanyIdByUserId(user.sub);

    return firstValueFrom(
      this.entityManagementService.send<Partial<ProductDto>>(
        ProductMessagePatterns.READ_OF_SUPPLIER_BY_ID,
        {
          ...props,
          supplierCompanyId,
        }
      )
    );
  }

  update(
    props: UpdateProductProps,
    user: AuthenticatedKCUser
  ): Promise<ProductDto> {
    const supplierCompanyId = this.getCompanyIdByUserId(user.sub);

    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_OF_SUPPLIER,
        {
          ...props,
          supplierCompanyId,
        }
      )
    );
  }

  private async getCompanyIdByUserId(userId: string): Promise<string | null> {
    const company = await this.companiesService.findOneByUserId({ id: userId });
    if (!company) {
      throw new UnauthorizedException(
        'Supplier company not found for the user'
      );
    }

    return company ? company.id : null;
  }
}
