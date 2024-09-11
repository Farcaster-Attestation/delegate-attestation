import { registerAs } from '@nestjs/config';

export const gcpConfig = registerAs('gcp', () => ({
  projectId: process.env.GCP_PROJECT_ID,
  privateKey: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.GCP_CLIENT_EMAIL
}));
