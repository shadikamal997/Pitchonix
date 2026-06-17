/**
 * Phase Ω.CERT.FINAL — Authorization / IDOR regression suite.
 *
 * Locks in the ownership enforcement added across the platform so the IDOR
 * class cannot silently regress:
 *   • ExportService.verifyDeckOwnership        (export pptx/pdf/withOptions)
 *   • GenerationController.assertProjectOwner / assertDeckOwner
 *   • UploadService.deleteImageOwnedBy         (DELETE /upload/:filename)
 *
 * Each uses a stub Prisma whose findFirst/findUnique returns a row ONLY when
 * the query's ownership filter matches the acting user — exactly how Postgres
 * would behave with the real `where: { ..., project: { userId } }` clause.
 */

import { ForbiddenException } from '@nestjs/common';
import { ExportService } from '../export.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const OWNER = 'user-owner';
const ATTACKER = 'user-attacker';
const DECK_ID = 'deck-123';
const PROJECT_ID = 'project-123';

/** A deck.findFirst stub that honours the `project: { userId }` ownership filter. */
function deckFindFirst({ exists = true, ownerId = OWNER, deleted = false } = {}) {
  return jest.fn(async ({ where }: any) => {
    if (where.id && where.id !== DECK_ID) return null;
    if (where.deletedAt === null && deleted) return null;
    const wantUser = where.project?.userId;
    if (wantUser && wantUser !== ownerId) return null;
    return exists ? { id: DECK_ID } : null;
  });
}

describe('Ω.CERT.FINAL — Export ownership (ExportService.verifyDeckOwnership)', () => {
  function make(stub: jest.Mock) {
    const prisma: any = { deck: { findFirst: stub } };
    return new ExportService(prisma);
  }

  it('allows the deck owner', async () => {
    const svc = make(deckFindFirst({ ownerId: OWNER }));
    await expect(svc.verifyDeckOwnership(DECK_ID, OWNER)).resolves.toBeUndefined();
  });

  it('rejects a non-owner with ForbiddenException', async () => {
    const svc = make(deckFindFirst({ ownerId: OWNER }));
    await expect(svc.verifyDeckOwnership(DECK_ID, ATTACKER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when the deck does not exist', async () => {
    const svc = make(deckFindFirst({ exists: false }));
    await expect(svc.verifyDeckOwnership(DECK_ID, OWNER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a soft-deleted deck', async () => {
    const svc = make(deckFindFirst({ ownerId: OWNER, deleted: true }));
    await expect(svc.verifyDeckOwnership(DECK_ID, OWNER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when userId is missing', async () => {
    const svc = make(deckFindFirst());
    await expect(svc.verifyDeckOwnership(DECK_ID, undefined as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('Ω.CERT.FINAL — Generation controller ownership helpers', () => {
  // The helpers only touch this.prisma, so we can build the controller with a
  // minimal stub and exercise the private guards directly.
  function makeController(prisma: any) {
    const { GenerationController } = require('../../generation/generation.controller');
    return new GenerationController(
      /* queue */ {},
      prisma,
      /* decksService */ {},
      /* qualityControlService */ {},
      /* pdfDocumentGenerationService */ {},
      /* layoutService */ {},
      /* themeService */ {},
      /* slideFactory */ {},
      /* slidesService */ {},
      /* migrationService */ {},
      /* slideElementsService */ {},
      /* autoExpansion */ {},
      /* scorecardService */ {},
      /* pipeline */ {},
    );
  }

  it('assertProjectOwner allows the owner', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.userId === OWNER && where.id === PROJECT_ID ? { id: PROJECT_ID } : null,
        ),
      },
    };
    const c: any = makeController(prisma);
    await expect(c.assertProjectOwner(PROJECT_ID, OWNER)).resolves.toBeUndefined();
  });

  it('assertProjectOwner blocks a non-owner', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.userId === OWNER && where.id === PROJECT_ID ? { id: PROJECT_ID } : null,
        ),
      },
    };
    const c: any = makeController(prisma);
    await expect(c.assertProjectOwner(PROJECT_ID, ATTACKER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('assertDeckOwner blocks a non-owner', async () => {
    const prisma = { deck: { findFirst: deckFindFirst({ ownerId: OWNER }) } };
    const c: any = makeController(prisma);
    await expect(c.assertDeckOwner(DECK_ID, ATTACKER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(c.assertDeckOwner(DECK_ID, OWNER)).resolves.toBeUndefined();
  });
});

describe('Ω.CERT.FINAL — Upload delete ownership (UploadService.deleteImageOwnedBy)', () => {
  const { UploadService } = require('../../upload/upload.service');

  function make(assetRow: any) {
    const configService = { get: (_k: string, d: any) => d } as any;
    const uploadedAssetService = {
      findByPublicPath: jest.fn(async () => assetRow),
      markDeletedByPublicPath: jest.fn(async () => {}),
    } as any;
    const svc = new UploadService(configService, uploadedAssetService);
    // Stub the physical unlink so the test never touches the filesystem.
    svc.deleteImage = jest.fn(async () => {});
    return { svc, uploadedAssetService };
  }

  it('allows the uploader to delete their own asset', async () => {
    const { svc, uploadedAssetService } = make({ userId: OWNER, deletedAt: null, project: null });
    await expect(svc.deleteImageOwnedBy('pic.png', OWNER)).resolves.toBeUndefined();
    expect(svc.deleteImage).toHaveBeenCalledWith('pic.png');
    expect(uploadedAssetService.markDeletedByPublicPath).toHaveBeenCalled();
  });

  it('allows the parent-project owner to delete', async () => {
    const { svc } = make({ userId: 'someone-else', deletedAt: null, project: { userId: OWNER } });
    await expect(svc.deleteImageOwnedBy('pic.png', OWNER)).resolves.toBeUndefined();
  });

  it('blocks a non-owner', async () => {
    const { svc } = make({ userId: OWNER, deletedAt: null, project: null });
    await expect(svc.deleteImageOwnedBy('pic.png', ATTACKER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(svc.deleteImage).not.toHaveBeenCalled();
  });

  it('blocks deletion of an untracked file (no ledger row)', async () => {
    const { svc } = make(null);
    await expect(svc.deleteImageOwnedBy('ghost.png', OWNER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks when no user is supplied', async () => {
    const { svc } = make({ userId: OWNER, deletedAt: null, project: null });
    await expect(svc.deleteImageOwnedBy('pic.png', undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
