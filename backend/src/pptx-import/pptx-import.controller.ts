import {
  Controller, Post, Get, UseInterceptors, UploadedFile, Body, BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PptxImportService } from './pptx-import.service';
import { roundTrip, buildSyntheticFixture } from './round-trip';
import { runVisualRegressionSuite } from './visual-regression';
import { buildGoldenFixtures } from './golden-fixtures';
import { certifyDeck } from './compatibility-certification';
import { runRendererDiagnostics } from './renderer-diagnostics';
import { loadRealFixtures, certifyDirectory } from './real-fixtures';

// =============================================================================
//  Phase 38D — PptxImportController
//
//    POST   /pptx-import/parse            multipart "file"    — preview JSON
//    POST   /pptx-import/into-project     multipart "file"    — persist as deck
//                                          query: projectId
// =============================================================================

@ApiTags('PPTX Import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('pptx-import')
export class PptxImportController {
  constructor(private importer: PptxImportService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse a PPTX/POTX file without persisting (Phase 38D MVP)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  parse(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing PPTX file (multipart field "file")');
    return this.importer.parseBuffer(file.buffer);
  }

  @Post('into-project')
  @ApiOperation({ summary: 'Import PPTX into a new Deck under the given project' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importIntoProject(
    @UploadedFile() file: any,
    @Body() body: { projectId: string },
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing PPTX file (multipart field "file")');
    if (!body?.projectId) throw new BadRequestException('Missing projectId');
    return this.importer.importIntoProject(file.buffer, body.projectId);
  }

  // ---------- Phase 38.1H — Round-trip harness ----------

  @Post('round-trip')
  @ApiOperation({ summary: 'Round-trip a PPTX through parse → export → re-parse + structural diff (Phase 38.1H)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async runRoundTrip(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing PPTX file (multipart field "file")');
    return roundTrip(this.importer, file.buffer);
  }

  @Get('round-trip/synthetic')
  @ApiOperation({ summary: 'Round-trip a built-in synthetic fixture (no upload required)' })
  async runSyntheticRoundTrip() {
    const buf = await buildSyntheticFixture();
    return roundTrip(this.importer, buf);
  }

  // ---------- Phase 38.3I — Visual regression suite ----------

  @Get('regression/golden')
  @ApiOperation({ summary: 'Run visual regression across the 10-archetype golden suite (Phase 38.3I)' })
  async runGoldenRegression() {
    const fixtures = await buildGoldenFixtures();
    return runVisualRegressionSuite(this.importer, fixtures, 'compare');
  }

  @Post('regression/establish')
  @ApiOperation({ summary: 'Establish baselines for the golden suite (writes PNGs to disk)' })
  async establishGoldenBaselines() {
    const fixtures = await buildGoldenFixtures();
    return runVisualRegressionSuite(this.importer, fixtures, 'establish');
  }

  // ---------- Phase 38.3K — Compatibility certification ----------

  @Post('certify')
  @ApiOperation({ summary: 'Compatibility certification (import + export + round-trip + visual)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async certify(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing PPTX file');
    return certifyDeck(this.importer, file.buffer);
  }

  // ---------- Phase 38.4A — Renderer diagnostics ----------

  @Get('diagnostics/renderer')
  @ApiOperation({ summary: 'Probe LibreOffice + Poppler health end-to-end (Phase 38.4A)' })
  diagnostics() {
    return runRendererDiagnostics();
  }

  // ---------- Phase 38.4B — Real-fixture drop directory ----------

  @Get('fixtures/real')
  @ApiOperation({ summary: 'List PPTX files dropped into backend/scripts/fixtures-pptx/' })
  listRealFixtures() {
    return loadRealFixtures();
  }

  @Get('fixtures/real/certify')
  @ApiOperation({ summary: 'Certify every real fixture in the drop directory (Phase 38.4B)' })
  certifyRealFixtures() {
    return certifyDirectory(this.importer);
  }
}
