import { Broker } from '@ap2/amqp';
import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [new Broker().getEntityManagerBroker(), CompaniesModule],
  providers: [SuppliersService],
  controllers: [SuppliersController],
})
export class SuppliersModule {}
