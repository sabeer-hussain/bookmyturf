import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({ example: 'logo.png' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'image/png', enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'File type must be image/jpeg, image/png, or image/webp',
  })
  fileType!: string;

  @ApiProperty({ example: 'venues', enum: ['avatars', 'logos', 'venues', 'courts'] })
  @IsString()
  @IsIn(['avatars', 'logos', 'venues', 'courts'], {
    message: 'Folder must be avatars, logos, venues, or courts',
  })
  folder!: string;
}
