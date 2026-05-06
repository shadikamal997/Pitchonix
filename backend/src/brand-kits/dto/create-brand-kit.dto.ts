import { IsString, IsOptional, IsHexColor } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBrandKitDto {
  @ApiProperty({ example: 'Tech Startup Brand', description: 'Brand kit name' })
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'https://example.com/logo.png', 
    description: 'URL to brand logo',
    required: false 
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ 
    example: '#8B5CF6', 
    description: 'Primary brand color (hex)',
    required: false 
  })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiProperty({ 
    example: '#06B6D4', 
    description: 'Secondary brand color (hex)',
    required: false 
  })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiProperty({ 
    example: 'Inter', 
    description: 'Font family name',
    required: false 
  })
  @IsOptional()
  @IsString()
  fontFamily?: string;
}
