export const jwtConfig = () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-too',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
});
