import { registerAs } from '@nestjs/config';

export const attestationConfig = registerAs('attestation', () => ({
  topDelegatesWithoutPartialVPSchemaId: process.env.TOP_DELEGATES_WITHOUT_PARTIAL_VP_SCHEMA,
  topDelegatesWithPartialVPSchemaId: process.env.TOP_DELEGATES_WITH_PARTIAL_VP_SCHEMA,
}));
