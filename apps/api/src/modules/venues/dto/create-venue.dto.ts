import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export enum VenueAmenity {
  DRINKING_WATER = 'drinking_water',
  WASHROOM = 'washroom',
  CHANGING_ROOM = 'changing_room',
  PARKING = 'parking',
  FLOODLIGHTS = 'floodlights',
  SEATING_AREA = 'seating_area',
  CCTV = 'cctv',
  FIRST_AID = 'first_aid',
  CAFETERIA = 'cafeteria',
  SHOE_RENTAL = 'shoe_rental',
  EQUIPMENT_RENTAL = 'equipment_rental',
  WIFI = 'wifi',
  AIR_CONDITIONED = 'air_conditioned',
}

export class CreateVenueDto {
  @ApiProperty({ example: 'SportArena Main', description: 'Venue name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Andheri West, Near Metro Station', description: 'Full address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '400058', description: '6-digit Indian pincode' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Pincode must be a 6-digit number' })
  pincode!: string;

  @ApiProperty({ example: '06:00', description: 'Opening time in HH:mm 24hr format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'openTime must be in HH:mm 24-hour format (e.g., 06:00)',
  })
  openTime!: string;

  @ApiProperty({ example: '23:00', description: 'Closing time in HH:mm 24hr format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'closeTime must be in HH:mm 24-hour format (e.g., 23:00)',
  })
  closeTime!: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Venue contact number' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @ApiPropertyOptional({ example: 19.1136, description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 72.8697, description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: ['parking', 'floodlights', 'drinking_water'],
    description: 'List of venue amenities',
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
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];
}
