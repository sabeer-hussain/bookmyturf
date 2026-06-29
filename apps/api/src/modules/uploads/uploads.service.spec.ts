import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UPLOAD_PROVIDER } from './providers/upload-provider.interface';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;
  let provider: Record<string, jest.Mock>;

  beforeEach(async () => {
    provider = {
      getPresignedUrl: jest
        .fn()
        .mockResolvedValue({ uploadUrl: 'http://upload', fileUrl: 'http://file' }),
    };
    const module = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: UPLOAD_PROVIDER, useValue: provider },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, any> = {
                'upload.maxFileSize': 5 * 1024 * 1024,
                'upload.allowedTypes': ['image/jpeg', 'image/png', 'image/webp'],
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();
    service = module.get(UploadsService);
  });

  it('returns presigned URL for valid file type', async () => {
    const result = await service.getPresignedUrl('logo.png', 'image/png', 'logos');
    expect(result.uploadUrl).toBe('http://upload');
    expect(provider.getPresignedUrl).toHaveBeenCalledWith('logo.png', 'image/png', 'logos');
  });

  it('throws for invalid file type', async () => {
    await expect(service.getPresignedUrl('doc.pdf', 'application/pdf', 'logos')).rejects.toThrow(
      BadRequestException,
    );
  });
});
