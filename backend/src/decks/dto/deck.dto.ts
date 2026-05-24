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

  // Phase 37.3J — clear / change of the applied brand kit.
  // `null` detaches the kit; a uuid switches it (without rebranding tokens —
  // for that, use POST /api/brand-kits/:id/apply/:deckId instead).
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  brandKitId?: string | null;
}
