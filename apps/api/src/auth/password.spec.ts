import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the original password and rejects a different password', () => {
    const storedHash = hashPassword('correct-horse-battery');

    expect(verifyPassword('correct-horse-battery', storedHash)).toBe(true);
    expect(verifyPassword('wrong-password', storedHash)).toBe(false);
  });

  it('uses a unique salt for each password hash', () => {
    expect(hashPassword('same-password')).not.toBe(hashPassword('same-password'));
  });

  it('rejects malformed stored hashes', () => {
    expect(verifyPassword('any-password', 'not-a-valid-hash')).toBe(false);
  });
});
