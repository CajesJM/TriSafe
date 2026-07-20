export type EnvironmentConfig = Record<string, unknown>;

export function validateEnvironment(config: EnvironmentConfig) {
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  const port = Number(config.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number.');
  }

  if (nodeEnv === 'production') {
    const jwtSecret = String(config.JWT_SECRET ?? '');
    const webOrigin = String(config.WEB_ORIGIN ?? '');
    if (jwtSecret.length < 32 || jwtSecret === 'replace-in-production') {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }
    if (!webOrigin || webOrigin === '*') {
      throw new Error('WEB_ORIGIN must be an explicit HTTPS origin in production.');
    }
    if (!webOrigin.startsWith('https://')) {
      throw new Error('WEB_ORIGIN must use HTTPS in production.');
    }
  }

  return { ...config, NODE_ENV: nodeEnv, PORT: port };
}
