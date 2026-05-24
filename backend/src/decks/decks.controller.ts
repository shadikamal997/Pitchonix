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
import { RequireRole } from '../workspaces/role.guard';

@ApiTags('Decks')
@Controller('decks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  // Phase 39 — `create` is workspace-scoped via the parent project. The
  // project itself already enforces ownership; the role guard on read/edit/
  // delete is sufficient.
  @Post('project/:projectId')
  @ApiOperation({ summary: 'Create a new deck for a project' })
  @RequireRole('deck.create', { kind: 'workspaceFromProject', param: 'projectId' })
  create(@Param('projectId') projectId: string, @Body() createDeckDto: CreateDeckDto) {
    return this.decksService.create(projectId, createDeckDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deck by ID' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'id' })
  findOne(@Param('id') id: string) {
    return this.decksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deck' })
  @RequireRole('deck.edit', { kind: 'workspaceFromDeck', param: 'id' })
  async update(
    @Param('id') id: string,
    @Body() updateDeckDto: UpdateDeckDto,
    @GetUser() user: any,
  ) {
    // Legacy ownership check kept as a defense-in-depth shim — the role guard
    // is the primary gate, but verifyOwnership still ensures the user owns
    // the parent project (for projects not yet attached to a workspace).
    await this.decksService.verifyOwnership(id, user.id);
    return this.decksService.update(id, updateDeckDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deck' })
  @RequireRole('deck.delete', { kind: 'workspaceFromDeck', param: 'id' })
  async remove(@Param('id') id: string, @GetUser() user: any) {
    await this.decksService.verifyOwnership(id, user.id);
    return this.decksService.remove(id);
  }
}
