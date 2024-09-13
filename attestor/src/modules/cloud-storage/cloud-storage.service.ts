import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bucket, Storage } from '@google-cloud/storage';

@Injectable()
export class CloudStorageService {
  private readonly storage: Storage;

  constructor(private readonly configService: ConfigService) {
    const googleAuthOptions = {
      projectId: this.configService.get('gcp.projectId'),
      credentials: {
        client_email: this.configService.get('gcp.clientEmail'),
        private_key: this.configService.get('gcp.privateKey'),
      },
    };
    this.storage = new Storage(googleAuthOptions);
  }

  async upload(
    bucketName: string,
    urlpath: string,
    file: Buffer,
    makePublic: boolean = false,
  ) {
    const bucket = new Bucket(this.storage, bucketName);
    const blob = bucket.file(urlpath);
    await blob.save(file);
    if (makePublic) {
      await blob.makePublic();
    }
  }

  async downloadAsString (
    bucketName: string,
    urlpath: string,
  ): Promise<string> {
    const bucket = new Bucket(this.storage, bucketName);
    const data = await bucket.file(urlpath).download()
    return data[0].toString('utf-8')
  }

  async checkFileExist (
    bucketName: string,
    urlpath: string,
  ): Promise<boolean> {
    const bucket = new Bucket(this.storage, bucketName);
    const [exists] = await bucket.file(urlpath).exists()
    return exists
  }
}