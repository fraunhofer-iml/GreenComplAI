import { ConfigurationModule } from '@ap2/configuration';
import { Module } from '@nestjs/common';
import { KeycloakUserManagementAdapter } from './keycloak/keycloak-user-management.adapter';
import { USER_MANAGEMENT_SERVICE_TOKEN } from './user-management.interface';

@Module({
  providers: [
    {
      provide: USER_MANAGEMENT_SERVICE_TOKEN,
      useClass: KeycloakUserManagementAdapter,
    },
  ],
  exports: [USER_MANAGEMENT_SERVICE_TOKEN],
  imports: [ConfigurationModule],
})
export class UserManagementModule {}
