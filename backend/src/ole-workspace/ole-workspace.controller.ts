import {
  Controller, Get, Post, Param, Body, UploadedFile, UseInterceptors, BadRequestException, UseGuards, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OleWorkspaceService } from './ole-workspace.service';

// =============================================================================
//  Phase 38.3G — OLE workspace controller
//
//    GET    /ole/:elementId
//    POST   /ole/:elementId/replace      multipart "file"
//    POST   /ole/:elementId/refresh
//    GET    /ole/:elementId/versions
//    POST   /ole/:elementId/revert       { version }
// =============================================================================

@ApiTags('OLE Workspace')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('ole')
export class OleWorkspaceController {
  constructor(private ole: OleWorkspaceService) {}

  @Get(':elementId')
  preview(@Param('elementId') id: string) {
    return this.ole.preview(id);
  }

  @Post(':elementId/replace')
  @ApiOperation({ summary: 'Replace the embedded OLE binary (Phase 38.3G)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  replace(
    @Param('elementId') id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing OLE file (multipart field "file")');
    return this.ole.replace(id, file, req?.user?.id);
  }

  @Post(':elementId/refresh')
  refresh(@Param('elementId') id: string) {
    return this.ole.refresh(id);
  }

  @Get(':elementId/versions')
  versions(@Param('elementId') id: string) {
    return this.ole.versions(id);
  }

  @Post(':elementId/revert')
  revert(@Param('elementId') id: string, @Body() body: { version: number }, @Req() req: any) {
    return this.ole.revert(id, Number(body?.version), req?.user?.id);
  }
}
