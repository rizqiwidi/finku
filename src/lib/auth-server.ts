import type { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import prisma from './db';
import { getJwtSecret } from './env';

export const AUTH_COOKIE_NAME = 'auth-token';
export const AUTH_SESSION_MAX_AGE_SECONDS = 4 * 60 * 60;
export const AUTH_SESSION_MAX_AGE_LABEL = '4h';

const authUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export class AuthError extends Error {
  status: number;

  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export async function createAuthToken(user: Pick<AuthUser, 'id' | 'username' | 'role'>) {
  return new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(AUTH_SESSION_MAX_AGE_LABEL)
    .sign(getJwtSecret());
}

export async function requireAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthError('Unauthorized', 401);
  }

  const secret = getJwtSecret();
  let userId = '';

  try {
    const { payload } = await jwtVerify(token, secret);
    userId = payload.userId as string;

    if (typeof userId !== 'string' || userId.length === 0) {
      throw new AuthError('Unauthorized', 401);
    }
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }

    throw new AuthError('Unauthorized', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect,
  });

  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthUser();

  if (user.role !== 'admin') {
    throw new AuthError('Forbidden', 403);
  }

  return user;
}
