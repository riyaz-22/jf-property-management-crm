type EnvAlias = {
  key: string;
  aliases?: string[];
};

const requiredEnvironment: EnvAlias[] = [
  { key: 'DATABASE_URL' },
  { key: 'JWT_SECRET', aliases: ['JWT_ACCESS_SECRET'] },
  { key: 'JWT_REFRESH_SECRET' },
  { key: 'PORT' },
  { key: 'FRONTEND_URL', aliases: ['CORS_ORIGIN'] },
];

const getEnvValue = ({ key, aliases = [] }: EnvAlias) =>
  [key, ...aliases].map((name) => process.env[name]).find((value) => value?.trim());

export const getRequiredEnv = (key: string, aliases: string[] = []) => {
  const value = getEnvValue({ key, aliases });

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const validateEnvironment = () => {
  const missing = requiredEnvironment
    .filter((item) => !getEnvValue(item))
    .map(({ key, aliases = [] }) =>
      aliases.length ? `${key} (or ${aliases.join(', ')})` : key,
    );

  if (missing.length) {
    throw new Error(
      `Backend startup blocked. Configure required environment variables: ${missing.join(', ')}`,
    );
  }
};
