import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UPLOAD_PROVIDER } from './providers/upload-provider.interface';
import { DevUploadProvider } from './providers/dev-upload.provider';
import { S3UploadProvider } from './providers/s3-upload.provider';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: UPLOAD_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get('upload.provider');
        if (provider === 's3') return new S3UploadProvider(config);
        return new DevUploadProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
