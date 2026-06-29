import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPLOAD_PROVIDER, UploadProvider } from './providers/upload-provider.interface';

@Injectable()
export class UploadsService {
  private maxFileSize: number;
  private allowedTypes: string[];

  constructor(
    private config: ConfigService,
    @Inject(UPLOAD_PROVIDER) private uploadProvider: UploadProvider,
  ) {
    this.maxFileSize = this.config.get('upload.maxFileSize') || 5 * 1024 * 1024;
    this.allowedTypes = this.config.get('upload.allowedTypes') || [];
  }

  async getPresignedUrl(fileName: string, fileType: string, folder: string) {
    if (!this.allowedTypes.includes(fileType)) {
      throw new BadRequestException(
        `File type ${fileType} not allowed. Use: ${this.allowedTypes.join(', ')}`,
      );
    }
    return this.uploadProvider.getPresignedUrl(fileName, fileType, folder);
  }

  getMaxFileSize() {
    return this.maxFileSize;
  }
}
