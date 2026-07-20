import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('accepts the local development configuration', () => {
    expect(validateEnvironment({ NODE_ENV: 'development', PORT: '3000' })).toMatchObject({ NODE_ENV: 'development', PORT: 3000 });
  });

  it('rejects weak production secrets', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production', PORT: '3000', JWT_SECRET: 'short', WEB_ORIGIN: 'https://admin.example.com' })).toThrow('JWT_SECRET');
  });

  it('rejects wildcard and non-HTTPS production origins', () => {
    const secret = 'a-secure-production-secret-with-32-chars';
    expect(() => validateEnvironment({ NODE_ENV: 'production', PORT: '3000', JWT_SECRET: secret, WEB_ORIGIN: '*' })).toThrow('WEB_ORIGIN');
    expect(() => validateEnvironment({ NODE_ENV: 'production', PORT: '3000', JWT_SECRET: secret, WEB_ORIGIN: 'http://admin.example.com' })).toThrow('HTTPS');
  });
});
