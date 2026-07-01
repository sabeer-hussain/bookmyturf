import { Injectable } from '@nestjs/common';
import { UploadProvider, UploadResult } from './upload-provider.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DevUploadProvider implements UploadProvider {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor() {
    mkdirSync(this.uploadDir, { recursive: true });
  }

  async getPresignedUrl(
    fileName: string,
    _fileType: string,
    folder: string,
  ): Promise<UploadResult> {
    const ext = fileName.split('.').pop();
    const key = `${folder}/${randomUUID()}.${ext}`;
    mkdirSync(join(this.uploadDir, folder), { recursive: true });
    const baseUrl = `http://localhost:4000`;
    const uploadUrl = `${baseUrl}/v1/uploads/file/${key}`;
    const fileUrl = `${baseUrl}/uploads/${key}`;
    return { uploadUrl, fileUrl };
  }
}
