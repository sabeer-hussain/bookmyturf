import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { PresignedUrlDto } from './dto/upload.dto';

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
}
