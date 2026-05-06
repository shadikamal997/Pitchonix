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
import { DecksService } from './decks.service';
import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Decks')
@Controller('decks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post('project/:projectId')
  @ApiOperation({ summary: 'Create a new deck for a project' })
  create(@Param('projectId') projectId: string, @Body() createDeckDto: CreateDeckDto) {
    return this.decksService.create(projectId, createDeckDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deck by ID' })
  findOne(@Param('id') id: string) {
    return this.decksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deck' })
  async update(
    @Param('id') id: string,
    @Body() updateDeckDto: UpdateDeckDto,
    @GetUser() user: any,
  ) {
    await this.decksService.verifyOwnership(id, user.id);
    return this.decksService.update(id, updateDeckDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deck' })
  async remove(@Param('id') id: string, @GetUser() user: any) {
    await this.decksService.verifyOwnership(id, user.id);
    return this.decksService.remove(id);
  }
}
