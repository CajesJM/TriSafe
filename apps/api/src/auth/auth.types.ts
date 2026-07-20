import { UserRole, UserStatus } from '@prisma/client';

export type AuthenticatedUser = { id: string; role: UserRole };

export type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user: AuthenticatedUser;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser & { status: UserStatus; fullName: string; email: string };
};
