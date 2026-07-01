import { Body, Controller, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UploadsService } from './uploads.service';
import { PresignedUrlDto } from './dto/upload.dto';
import { Request } from 'express';
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presigned')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned upload URL' })
  getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return this.uploadsService.getPresignedUrl(dto.fileName, dto.fileType, dto.folder);
  }

  @Public()
  @Put('file/:folder/:filename')
  @ApiOperation({ summary: 'Upload file (dev mode only)' })
  async uploadFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Req() req: Request,
  ) {
    const filePath = join(process.cwd(), 'uploads', folder, filename);
    mkdirSync(dirname(filePath), { recursive: true });

    return new Promise<{ message: string }>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      req.pipe(stream);
      stream.on('finish', () => resolve({ message: 'File uploaded' }));
      stream.on('error', reject);
    });
  }
}
