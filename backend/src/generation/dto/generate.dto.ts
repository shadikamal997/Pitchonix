import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsString()
  projectId: string;

  @ApiProperty({
    example: {
      companyName: 'TechCorp',
      problem: 'Businesses struggle with data analysis',
      solution: 'AI-powered analytics platform',
      market: 'B2B SaaS, $50B market',
      businessModel: 'Subscription-based, $99-$999/month',
      traction: '1000 users, $50K MRR',
      roadmap: 'Q1: Launch v2.0, Q2: Enterprise features',
      ask: '$2M Seed funding',
    },
  })
  @IsObject()
  input: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateId?: string;
}
