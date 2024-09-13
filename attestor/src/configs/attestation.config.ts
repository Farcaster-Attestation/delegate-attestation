import { registerAs } from '@nestjs/config';

export const attestationConfig = registerAs('attestation', () => ({
  bucketName: process.env.BUCKET_NAME,
  top100DelegatesSchema: process.env.TOP100_DELEGATES_SCHEMA,
}));
