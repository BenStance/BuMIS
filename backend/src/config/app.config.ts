export const appConfig = () => ({
  name: process.env.APP_NAME ?? 'BuMIS',
  port: Number(process.env.APP_PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
});
