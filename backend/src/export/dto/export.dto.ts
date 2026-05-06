import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportDto {
  @ApiProperty({ example: 'deck-uuid' })
  @IsString()
  deckId: string;

  @ApiProperty({ example: 'pptx', enum: ['pptx', 'pdf'] })
  @IsEnum(['pptx', 'pdf'])
  format: 'pptx' | 'pdf';
}
