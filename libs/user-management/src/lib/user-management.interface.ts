import {
  UserAccountCreatedResult,
  UserCreationData,
} from '@ap2/api-interfaces';

export interface IUserManagementService {
  createUser(userData: UserCreationData): Promise<UserAccountCreatedResult>;
  deleteUser(userId: string): Promise<void>;
}

export const USER_MANAGEMENT_SERVICE_TOKEN = 'IUserManagementService';
