const INVALID_JWT_SECRET_PATTERNS = [
  'your-secret-key',
  'your-super-secret',
  'change-in-production',
  'replace-with',
  'REPLACE_ME',
  'generate-dengan',
];

export interface BootstrapAdminConfig {
  username: string;
  password: string;
  name: string;
  email: string | null;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getJwtSecret() {
  const secret = getRequiredEnv('JWT_SECRET');

  if (
    secret.length < 32 ||
    INVALID_JWT_SECRET_PATTERNS.some((pattern) => secret.includes(pattern))
  ) {
    throw new Error(
      'JWT_SECRET must be a random string with at least 32 characters and must not use the placeholder value'
    );
  }

  return new TextEncoder().encode(secret);
}

export function getBootstrapAdminConfig(): BootstrapAdminConfig | null {
  const username = getOptionalEnv('ADMIN_BOOTSTRAP_USERNAME');
  const password = getOptionalEnv('ADMIN_BOOTSTRAP_PASSWORD');

  if (!username && !password) {
    return null;
  }

  if (!username || !password) {
    throw new Error(
      'ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD must be set together'
    );
  }

  return {
    username,
    password,
    name: getOptionalEnv('ADMIN_BOOTSTRAP_NAME') ?? 'Administrator',
    email: getOptionalEnv('ADMIN_BOOTSTRAP_EMAIL') ?? null,
  };
}
