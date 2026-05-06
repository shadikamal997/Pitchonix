import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSlideDto {
  @ApiProperty({ example: 'cover' })
  @IsString()
  type: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({ example: 'Revolutionary AI Platform' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Transforming the future', required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ example: { sections: [], items: [] } })
  @IsObject()
  content: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  speakerNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  layoutKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  themeKey?: string;
}

export class UpdateSlideDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  speakerNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  layoutKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  themeKey?: string;
}
