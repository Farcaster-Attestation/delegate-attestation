import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { gcpConfig } from './configs/gcp.config';
import { attestationConfig } from './configs/attestation.config';
import { easConfig } from './configs/eas.config';
import { appConfig } from './configs/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [gcpConfig, attestationConfig, easConfig, appConfig]
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
