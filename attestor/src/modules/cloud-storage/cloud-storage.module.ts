import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudStorageService } from './cloud-storage.service';

@Module({
  imports: [],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class CloudStorageModule {}