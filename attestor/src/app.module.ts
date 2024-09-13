import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { gcpConfig } from './configs/gcp.config';
import { attestationConfig } from './configs/attestation.config';
import { easConfig } from './configs/eas.config';
import { appConfig } from './configs/app.config';
import { EASModule } from './modules/eas/eas.module';
import { CloudStorageModule } from './modules/cloud-storage/cloud-storage.module';
import { AttestationModule } from './modules/attestation/attestation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [gcpConfig, attestationConfig, easConfig, appConfig],
      isGlobal: true,
    }),
    AttestationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
