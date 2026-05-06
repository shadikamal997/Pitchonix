import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SlidesService } from './slides.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Slides')
@Controller('slides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Post('deck/:deckId')
  @ApiOperation({ summary: 'Create a new slide' })
  create(@Param('deckId') deckId: string, @Body() createSlideDto: CreateSlideDto) {
    return this.slidesService.create(deckId, createSlideDto);
  }

  @Get('deck/:deckId')
  @ApiOperation({ summary: 'Get all slides for a deck' })
  findAll(@Param('deckId') deckId: string) {
    return this.slidesService.findAll(deckId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get slide by ID' })
  findOne(@Param('id') id: string) {
    return this.slidesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update slide' })
  async update(
    @Param('id') id: string,
    @Body() updateSlideDto: UpdateSlideDto,
    @GetUser() user: any,
  ) {
    await this.slidesService.verifyOwnership(id, user.id);
    return this.slidesService.update(id, updateSlideDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete slide' })
  async remove(@Param('id') id: string, @GetUser() user: any) {
    await this.slidesService.verifyOwnership(id, user.id);
    return this.slidesService.remove(id);
  }
}
