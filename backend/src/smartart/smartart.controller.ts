import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmartArtService, SmartArtKind } from './smartart.service';

// =============================================================================
//  Phase 38.3C — SmartArt controller
//
//    GET    /smartart/:elementId
//    POST   /smartart/:elementId/nodes              { parentId, text }
//    PATCH  /smartart/:elementId/nodes/:nodeId      { text }
//    DELETE /smartart/:elementId/nodes/:nodeId
//    POST   /smartart/:elementId/nodes/:nodeId/move { index }
//    POST   /smartart/:elementId/layout             { kind }
// =============================================================================

@ApiTags('SmartArt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('smartart')
export class SmartArtController {
  constructor(private smartArt: SmartArtService) {}

  @Get(':elementId')
  get(@Param('elementId') id: string) {
    return this.smartArt.get(id);
  }

  @Post(':elementId/nodes')
  @ApiOperation({ summary: 'Add a node to a SmartArt (Phase 38.3C)' })
  add(@Param('elementId') id: string, @Body() body: { parentId?: string | null; text?: string }) {
    return this.smartArt.addNode(id, body?.parentId ?? null, body?.text ?? '');
  }

  @Patch(':elementId/nodes/:nodeId')
  update(@Param('elementId') id: string, @Param('nodeId') nodeId: string, @Body() body: { text?: string }) {
    return this.smartArt.updateNode(id, nodeId, body || {});
  }

  @Delete(':elementId/nodes/:nodeId')
  remove(@Param('elementId') id: string, @Param('nodeId') nodeId: string) {
    return this.smartArt.removeNode(id, nodeId);
  }

  @Post(':elementId/nodes/:nodeId/move')
  move(@Param('elementId') id: string, @Param('nodeId') nodeId: string, @Body() body: { index: number }) {
    return this.smartArt.reorderNode(id, nodeId, Math.max(0, Math.round(body?.index ?? 0)));
  }

  @Post(':elementId/layout')
  @ApiOperation({ summary: 'Change SmartArt layout kind (re-flows shapes)' })
  changeLayout(@Param('elementId') id: string, @Body() body: { kind: SmartArtKind }) {
    return this.smartArt.changeLayout(id, body.kind);
  }
}
