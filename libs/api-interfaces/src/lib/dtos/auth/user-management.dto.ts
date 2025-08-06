export interface UserCreationData {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  initialPassword?: string;
  roles?: string[];
  groups?: string[];
  companyId?: string;
}

export interface UserAccountCreatedResult {
  id: string;
  username: string;
  email: string;
}
