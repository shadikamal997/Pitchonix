import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeckDto {
  @ApiProperty({ example: 'My Startup Pitch Deck' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Pitch deck for Series A funding', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  brandKitId?: string;
}

export class UpdateDeckDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
