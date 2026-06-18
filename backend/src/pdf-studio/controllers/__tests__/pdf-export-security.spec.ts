import { HttpException, HttpStatus } from '@nestjs/common';
import { PdfExportController } from '../pdf-export.controller';

const OWNER = 'owner-user';
const ATTACKER = 'attacker-user';
const DOCUMENT_ID = 'pdf-doc-1';

function makeController(ownerId = OWNER) {
  const prisma = {
    pdfDocument: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.id === DOCUMENT_ID
          ? { id: DOCUMENT_ID, project: { id: 'project-1', userId: ownerId } }
          : null,
      ),
    },
  };
  const controller: any = new PdfExportController(
    { exportDocument: jest.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    prisma as any,
    {} as any,
    {} as any,
  );
  return { controller, prisma };
}

describe('PDF Studio export security during backpressure', () => {
  it('rejects non-owner export before touching the busy PDF queue', async () => {
    const { controller } = makeController(OWNER);
    const pdfExportService = {
      exportDocument: jest.fn(async () => {
        throw new Error('queue should not be reached');
      }),
    };
    controller.pdfExportService = pdfExportService;

    await expect(controller.exportDocument(DOCUMENT_ID, { id: ATTACKER }, 'pdf')).rejects.toMatchObject(
      {
        status: HttpStatus.FORBIDDEN,
      },
    );
    expect(pdfExportService.exportDocument).not.toHaveBeenCalled();
  });

  it('does not expose document metadata when a queued non-owner export fails', async () => {
    const { controller } = makeController(OWNER);

    try {
      await controller.exportDocument(DOCUMENT_ID, { id: ATTACKER }, 'pdf');
      throw new Error('expected forbidden');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(String((error as HttpException).getResponse())).not.toContain(DOCUMENT_ID);
      expect(String((error as HttpException).getResponse())).not.toContain('project-1');
    }
  });

  it('rejects documents without an authenticated matching project owner', async () => {
    const { controller, prisma } = makeController(OWNER);
    prisma.pdfDocument.findUnique.mockResolvedValueOnce({
      id: DOCUMENT_ID,
      project: { id: 'project-1', userId: null },
    });

    await expect(controller.exportDocument(DOCUMENT_ID, { id: OWNER }, 'pdf')).rejects.toMatchObject(
      {
        status: HttpStatus.FORBIDDEN,
      },
    );
  });
});
