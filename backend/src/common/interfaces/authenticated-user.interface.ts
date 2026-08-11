export interface AuthenticatedUser {
  sub: string;
  email: string;
  businessId?: string | null;
  roleId: string;
}
