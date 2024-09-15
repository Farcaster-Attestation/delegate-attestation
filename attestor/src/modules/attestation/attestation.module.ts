import { Module } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { EASModule } from '../eas/eas.module';
import { CloudStorageModule } from '../cloud-storage/cloud-storage.module';
import { AttestationController } from './attestation.controller';

@Module({
  imports: [
    CloudStorageModule,
    EASModule,
  ],
  controllers: [AttestationController],
  providers: [AttestationService],
  exports: [AttestationService],
})
export class AttestationModule {}
