import { UserRole, UserStatus } from '@prisma/client';

export type AuthenticatedUser = { id: string; role: UserRole };

export type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user: AuthenticatedUser;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser & { status: UserStatus; fullName: string; username?: string | null; email: string; phone?: string | null; avatarData?: string | null };
};

export type AdminProfile = {
  id: string;
  fullName: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatarData: string | null;
  role: UserRole;
  status: UserStatus;
};
