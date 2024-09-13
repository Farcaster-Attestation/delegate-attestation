import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AttestationService } from './attestation.service';

@Controller('attestation')
export class AttestationController {
  constructor(private readonly attestationService: AttestationService) {}

  // this for debug and hot fix
  @Post('top100delegates/attest')
  async attestDelegates() {
    await this.attestationService.attestTop100Delegates()
  }
}
