import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { UploadProvider, UploadResult } from './upload-provider.interface';

@Injectable()
export class S3UploadProvider implements UploadProvider {
  private s3: S3Client;
  private bucket: string;
  private cloudfrontUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('aws.region'),
      credentials: {
        accessKeyId: this.config.get('aws.accessKeyId') || '',
        secretAccessKey: this.config.get('aws.secretAccessKey') || '',
      },
    });
    this.bucket = this.config.get('aws.s3Bucket') || '';
    this.cloudfrontUrl = this.config.get('aws.cloudfrontUrl') || '';
  }

  async getPresignedUrl(fileName: string, fileType: string, folder: string): Promise<UploadResult> {
    const ext = fileName.split('.').pop();
    const key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const fileUrl = this.cloudfrontUrl
      ? `${this.cloudfrontUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  }
}
