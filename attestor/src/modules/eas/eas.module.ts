import { Module } from '@nestjs/common';
import { EASService } from './eas.service';

@Module({
  controllers: [],
  providers: [EASService],
  exports: [EASService],
})
export class EASModule {}
