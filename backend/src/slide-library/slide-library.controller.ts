import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { SlideLibraryService } from './slide-library.service';

// =============================================================================
//  Phase 38O — SlideLibraryController
//
//    GET    /slide-library?kind=slide|section
//    GET    /slide-library/:id
//    POST   /slide-library/from-slide              { slideId, name, … }
//    POST   /slide-library/from-section            { sectionId, name, … }
//    POST   /slide-library/:id/insert/:deckId
//    DELETE /slide-library/:id
// =============================================================================

@ApiTags('Slide Library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class SlideLibraryController {
  constructor(private library: SlideLibraryService) {}

  @Get('slide-library')
  list(
    @GetUser() user: any,
    @Query('kind') kind?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.library.list({
      userId:      user?.id ?? null,
      workspaceId: workspaceId || null,
      kind,
    });
  }

  @Get('slide-library/:id')
  findOne(@Param('id') id: string) {
    return this.library.findOne(id);
  }

  @Post('slide-library/from-slide')
  @ApiOperation({ summary: 'Save a slide to the library (Phase 38O)' })
  fromSlide(
    @GetUser() user: any,
    @Body() body: {
      slideId: string; name: string; description?: string;
      tags?: string[]; thumbnail?: string | null; workspaceId?: string;
    },
  ) {
    return this.library.saveSlide({
      ...body,
      userId: user?.id ?? null,
    });
  }

  @Post('slide-library/from-section')
  @ApiOperation({ summary: 'Save a section to the library' })
  fromSection(
    @GetUser() user: any,
    @Body() body: {
      sectionId: string; name: string; description?: string;
      tags?: string[]; thumbnail?: string | null; workspaceId?: string;
    },
  ) {
    return this.library.saveSection({
      ...body,
      userId: user?.id ?? null,
    });
  }

  @Post('slide-library/:id/insert/:deckId')
  @ApiOperation({ summary: 'Insert a library entry into a deck' })
  insert(@Param('id') id: string, @Param('deckId') deckId: string) {
    return this.library.insertIntoDeck(id, deckId);
  }

  @Delete('slide-library/:id')
  remove(@Param('id') id: string) {
    return this.library.remove(id);
  }
}
