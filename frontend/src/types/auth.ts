export type UserRole =
  | 'ADMIN'
  | 'COMPONENT_TRACKER'
  | 'RECEIVE_USER'
  | 'DELIVERY_USER'
  | 'REPORT_VIEWER';

export interface User {
  id: string;
  userCode: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}
