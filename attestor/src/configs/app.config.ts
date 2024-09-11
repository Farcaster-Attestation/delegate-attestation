import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT) || 9000,
  apiKey: process.env.API_KEY || 'secret',
}));
