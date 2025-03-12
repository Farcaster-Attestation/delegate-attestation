import {
  AttestationRequestData,
  EAS,
  SchemaEncoder,
  SchemaRecord,
  SchemaRegistry,
  SignedOffchainAttestation,
} from '@ethereum-attestation-service/eas-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { AttestRequestData, AttestResult } from './dto/dto';

@Injectable()
export class EASService {
  private rpcUrl: string;
  private easAddress: string;
  private eas: EAS;
  private wallet: ethers.Wallet;
  private schemaRegistry: SchemaRegistry;
  private schemas: Record<string, SchemaRecord> = {};

  constructor(private readonly configService: ConfigService) {
    this.rpcUrl = this.configService.get<string>('eas.rpcUrl');
    this.easAddress = this.configService.get<string>('eas.eas');
    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(
      this.configService.get<string>('eas.privateKey'),
      provider,
    );
    this.eas = new EAS(this.easAddress);
    this.eas.connect(this.wallet);
    this.schemaRegistry = new SchemaRegistry(
      this.configService.get<string>('eas.schemaRegistry'),
    );
    this.schemaRegistry.connect(this.wallet);
  }

  async offchainAttest(
    schemaId: string,
    requestData: AttestRequestData,
  ): Promise<SignedOffchainAttestation> {
    // get schema
    if (!this.schemas[schemaId]) {
      this.schemas[schemaId] = await this.schemaRegistry.getSchema({
        uid: schemaId,
      });
    }
    const schema = this.schemas[schemaId];
    const schemaEncoder = new SchemaEncoder(schema.schema);
    const data: AttestationRequestData = {
      recipient: requestData.recipient,
      data: schemaEncoder.encodeData(requestData.datas),
    };
    if (requestData.expirationTime) {
      data.expirationTime = BigInt(requestData.expirationTime);
    }
    if (requestData.revocable) {
      data.revocable = requestData.revocable;
    }
    if (requestData.refUID) {
      data.refUID = requestData.refUID;
    }
    if (requestData.value) {
      data.value = BigInt(requestData.value);
    }
    const offchain = await this.eas.getOffchain();
    const attestation = await offchain.signOffchainAttestation(
      {
        schema: schema.uid,
        data: data.data,
        recipient: data.recipient,
        time: BigInt(Math.floor(Date.now() / 1000)),
        revocable: data.revocable || true,
        expirationTime: data.expirationTime || BigInt(0),
        refUID:
          data.refUID ||
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      },
      this.wallet,
    );
    return attestation;
  }

  async mockAttest(
    schemaId: string,
    requestDatas: AttestRequestData[],
  ): Promise<AttestResult[]> {
    const txhash = '0x' + Math.random().toString(16).slice(2);
    const results = requestDatas.map((requestData) => {
      return {
        txhash,
        easId: '0x' + Math.random().toString(16).slice(2),
        tx: null,
      };
    });
    return results;
  }

  async mockRevoke(schemaId: string, easIds: string[]): Promise<string> {
    return '0x' + Math.random().toString(16).slice(2);
  }

  async multipleAttest(
    schemaId: string,
    requestDatas: AttestRequestData[],
  ): Promise<AttestResult[]> {
    // get schema
    if (!this.schemas[schemaId]) {
      this.schemas[schemaId] = await this.schemaRegistry.getSchema({
        uid: schemaId,
      });
    }
    const schema = this.schemas[schemaId];
    const schemaEncoder = new SchemaEncoder(schema.schema);
    const datas: AttestationRequestData[] = requestDatas.map((requestData) => {
      const data: AttestationRequestData = {
        recipient: requestData.recipient,
        data: schemaEncoder.encodeData(requestData.datas),
      };
      if (requestData.expirationTime) {
        data.expirationTime = BigInt(requestData.expirationTime);
      }
      if (requestData.revocable) {
        data.revocable = requestData.revocable;
      }
      if (requestData.refUID) {
        data.refUID = requestData.refUID;
      }
      if (requestData.value) {
        data.value = BigInt(requestData.value);
      }
      return data;
    });
    console.log('before attest');
    const tx = await this.eas.multiAttest([
      {
        schema: schemaId,
        data: datas,
      },
    ]);
    console.log('waiting');
    await tx.wait();
    const logs = tx.receipt.logs;
    const results = logs.map((log) => {
      const easId = log.data;
      return {
        txhash: log.transactionHash,
        easId,
        tx: tx,
      };
    });
    return results;
  }

  async multipleRevoke(schemaId: string, easIds: string[]): Promise<string> {
    // get schema
    const datas = easIds.map((easId) => {
      return {
        uid: easId,
      };
    });
    const tx = await this.eas.multiRevoke([
      {
        schema: schemaId,
        data: datas,
      },
    ]);
    await tx.wait();
    return tx.receipt.hash;
  }
}
