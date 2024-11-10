import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { AttestationService } from 'src/modules/attestation/attestation.service';

const main = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const attestationService = app.get(AttestationService);
  // await attestationService.attestTop100Delegates()
  await attestationService.attest();
};

main()
  .then(() => process.exit(0))
  .catch(console.error);
