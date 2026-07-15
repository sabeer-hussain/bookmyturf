import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { VenueAmenity } from './create-venue.dto';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'SportArena Pro', description: 'Venue name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Andheri West, Near Metro Station' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '400058', description: '6-digit Indian pincode' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be a 6-digit number' })
  pincode?: string;

  @ApiPropertyOptional({ example: '06:00', description: 'Opening time in HH:mm 24hr format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'openTime must be in HH:mm 24-hour format (e.g., 06:00)',
  })
  openTime?: string;

  @ApiPropertyOptional({ example: '23:00', description: 'Closing time in HH:mm 24hr format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'closeTime must be in HH:mm 24-hour format (e.g., 23:00)',
  })
  closeTime?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @ApiPropertyOptional({ example: 19.1136 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 72.8697 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: ['parking', 'floodlights', 'drinking_water'],
    type: [String],
    enum: VenueAmenity,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(VenueAmenity, { each: true, message: 'Each amenity must be a valid predefined value' })
  amenities?: VenueAmenity[];

  @ApiPropertyOptional({
    example: ['https://cdn.bookmyturf.in/venues/img1.jpg'],
    description: 'Array of image URLs (max 5)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed per venue' })
  @IsUrl({ require_tld: false }, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];
}
