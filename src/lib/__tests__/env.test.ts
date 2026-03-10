import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getBootstrapAdminConfig, getJwtSecret } from '../env.ts';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
});

test('getJwtSecret rejects placeholder values', () => {
  process.env.JWT_SECRET = 'REPLACE_ME_WITH_AT_LEAST_32_RANDOM_CHARACTERS';

  assert.throws(() => getJwtSecret(), /JWT_SECRET/);
});

test('getJwtSecret accepts strong secrets', () => {
  process.env.JWT_SECRET = 'this-is-a-valid-32-char-secret-value-1234';

  const secret = getJwtSecret();

  assert.ok(secret instanceof Uint8Array);
  assert.equal(secret.length > 0, true);
});

test('getBootstrapAdminConfig requires username and password together', () => {
  delete process.env.ADMIN_BOOTSTRAP_USERNAME;
  process.env.ADMIN_BOOTSTRAP_PASSWORD = 'secret';

  assert.throws(() => getBootstrapAdminConfig(), /must be set together/);
});

test('getBootstrapAdminConfig returns null when bootstrap env is absent', () => {
  delete process.env.ADMIN_BOOTSTRAP_USERNAME;
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;

  assert.equal(getBootstrapAdminConfig(), null);
});
