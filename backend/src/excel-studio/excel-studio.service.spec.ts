import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { ExcelStudioService } from './excel-studio.service';

function createMemoryPrisma(project: any) {
  const state = {
    project,
    operations: [] as any[],
    versions: [] as any[],
    snapshots: [] as any[],
  };
  const matchesWhere = (row: any, where: any = {}) => {
    for (const [key, value] of Object.entries(where)) {
      if (key === 'id' && typeof value === 'object' && value && 'in' in value) {
        if (!(value as any).in.includes(row.id)) return false;
      } else if (key === 'id' && typeof value === 'object' && value && 'notIn' in value) {
        if ((value as any).notIn.includes(row.id)) return false;
      } else if (row[key] !== value) {
        return false;
      }
    }
    return true;
  };
  const sortRows = (rows: any[], orderBy?: any) => {
    if (!orderBy) return rows;
    const [key, direction] = Object.entries(orderBy)[0] as [string, string];
    return [...rows].sort((a, b) =>
      direction === 'desc'
        ? Number(b[key] || 0) - Number(a[key] || 0)
        : Number(a[key] || 0) - Number(b[key] || 0),
    );
  };
  return {
    state,
    excelProject: {
      findFirst: jest.fn(async ({ where }: any) =>
        matchesWhere(state.project, where) ? state.project : null,
      ),
      update: jest.fn(async ({ data }: any) => {
        state.project = { ...state.project, ...data, updatedAt: new Date() };
        return state.project;
      }),
    },
    excelWorkbookOperation: {
      findMany: jest.fn(async ({ where, orderBy }: any = {}) =>
        sortRows(
          state.operations.filter((row) => matchesWhere(row, where)),
          orderBy,
        ),
      ),
      findFirst: jest.fn(
        async ({ where, orderBy }: any = {}) =>
          sortRows(
            state.operations.filter((row) => matchesWhere(row, where)),
            orderBy,
          )[0] || null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { ...data, createdAt: new Date(), undoneAt: null, redoneAt: null };
        state.operations.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const index = state.operations.findIndex((row) => row.id === where.id);
        state.operations[index] = { ...state.operations[index], ...data };
        return state.operations[index];
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (let i = 0; i < state.operations.length; i++) {
          if (matchesWhere(state.operations[i], where)) {
            state.operations[i] = { ...state.operations[i], ...data };
            count++;
          }
        }
        return { count };
      }),
    },
    excelWorkbookVersion: {
      findFirst: jest.fn(
        async ({ where, orderBy }: any = {}) =>
          sortRows(
            state.versions.filter((row) => matchesWhere(row, where)),
            orderBy,
          )[0] || null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { ...data, createdAt: new Date() };
        state.versions.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const index = state.versions.findIndex((row) => row.id === where.id);
        state.versions[index] = { ...state.versions[index], ...data };
        return state.versions[index];
      }),
    },
    excelWorkbookSnapshot: {
      findMany: jest.fn(async ({ where, orderBy }: any = {}) =>
        sortRows(
          state.snapshots.filter((row) => matchesWhere(row, where)),
          orderBy,
        ),
      ),
      findFirst: jest.fn(
        async ({ where }: any = {}) =>
          state.snapshots.find((row) => matchesWhere(row, where)) || null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { ...data, createdAt: new Date(), restoredAt: null };
        state.snapshots.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const index = state.snapshots.findIndex((row) => row.id === where.id);
        state.snapshots[index] = { ...state.snapshots[index], ...data };
        return state.snapshots[index];
      }),
    },
  };
}

function createWorkbookProject() {
  const wb = XLSX.utils.book_new();
  const ws: any = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Revenue', 100],
  ]);
  ws['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Model');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const relPath = path.join(
    'uploads',
    'excel-studio',
    'workbooks',
    `test-${Date.now()}-${Math.random()}.xlsx`,
  );
  fs.mkdirSync(path.join(process.cwd(), 'uploads', 'excel-studio', 'workbooks'), {
    recursive: true,
  });
  fs.writeFileSync(path.join(process.cwd(), relPath), buffer);
  const analysisService: any = new ExcelStudioService(
    createMemoryPrisma({}).excelProject as any,
    { record: async () => null } as any,
    {
      recordImport: async () => ({ imported: 0 }),
      recordExport: async () => 0,
      recordReopen: async () => ({ reopened: 0, mutated: 0, lost: 0 }),
    } as any,
  );
  const analysis = analysisService.analyzeWorkbook(buffer, 'model.xlsx');
  return {
    project: {
      id: 'project-1',
      userId: 'user-1',
      title: 'Model',
      filename: 'model.xlsx',
      originalFilePath: relPath,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: buffer.length,
      status: 'analyzed',
      activeTemplateId: 'executive-emerald',
      analysis,
      enhancementPlan: [],
      appliedActions: [],
      exports: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    buffer,
    cleanup: () => {
      try {
        fs.unlinkSync(path.join(process.cwd(), relPath));
      } catch {}
    },
  };
}

describe('ExcelStudioService workbook operation foundation', () => {
  it('persists cell/formula operations, undo/redo, snapshots, diff, and export replay while preserving original export', async () => {
    const { project, buffer, cleanup } = createWorkbookProject();
    const prisma = createMemoryPrisma(project);
    const service: any = new ExcelStudioService(
      prisma as any,
      { record: async () => null } as any,
      {
        recordImport: async () => ({ imported: 0 }),
        recordExport: async () => 0,
        recordReopen: async () => ({ reopened: 0, mutated: 0, lost: 0 }),
      } as any,
    );
    try {
      await service.createWorkbookOperation('user-1', 'project-1', {
        type: 'setCellValue',
        sheetName: 'Model',
        target: { address: 'B2' },
        payload: { value: 250 },
      });
      let enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      let workbook = XLSX.read(enhanced.body, { type: 'buffer', cellFormula: true });
      expect(workbook.Sheets.Model.B2.v).toBe(250);

      await service.createWorkbookOperation('user-1', 'project-1', {
        type: 'setFormula',
        sheetName: 'Model',
        target: { address: 'C2' },
        payload: { formula: 'B2*2', cachedValue: 500 },
      });
      enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      workbook = XLSX.read(enhanced.body, { type: 'buffer', cellFormula: true });
      expect(workbook.Sheets.Model.C2.f).toBe('B2*2');

      const snapshot1 = await service.createWorkbookSnapshot(
        'user-1',
        'project-1',
        'After formula',
      );

      await service.undoLastWorkbookOperation('user-1', 'project-1');
      enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      workbook = XLSX.read(enhanced.body, { type: 'buffer', cellFormula: true });
      expect(workbook.Sheets.Model.C2).toBeUndefined();

      await service.redoLastWorkbookOperation('user-1', 'project-1');
      enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      workbook = XLSX.read(enhanced.body, { type: 'buffer', cellFormula: true });
      expect(workbook.Sheets.Model.C2.f).toBe('B2*2');

      await service.createWorkbookOperation('user-1', 'project-1', {
        type: 'setCellValue',
        sheetName: 'Model',
        target: { address: 'B3' },
        payload: { value: 'New row' },
      });
      const snapshot2 = await service.createWorkbookSnapshot(
        'user-1',
        'project-1',
        'After new row',
      );
      const diff = await service.compareWorkbookSnapshots(
        'user-1',
        'project-1',
        snapshot1.id,
        snapshot2.id,
      );
      expect(diff.added.some((item: any) => item.type === 'cell' && item.address === 'B3')).toBe(
        true,
      );

      await service.restoreWorkbookSnapshot('user-1', 'project-1', snapshot1.id);
      enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      workbook = XLSX.read(enhanced.body, { type: 'buffer', cellFormula: true });
      expect(workbook.Sheets.Model.B3).toBeUndefined();

      const original = await service.exportProject('user-1', 'project-1', 'original-xlsx');
      expect(Buffer.from(original.body).equals(buffer)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('converts enhancement actions into replayable workbook operations', async () => {
    const { project, cleanup } = createWorkbookProject();
    const prisma = createMemoryPrisma(project);
    const service: any = new ExcelStudioService(
      prisma as any,
      { record: async () => null } as any,
      {
        recordImport: async () => ({ imported: 0 }),
        recordExport: async () => 0,
        recordReopen: async () => ({ reopened: 0, mutated: 0, lost: 0 }),
      } as any,
    );
    try {
      await service.applyAction('user-1', 'project-1', 'freezeHeaderRow');
      await service.applyAction('user-1', 'project-1', 'standardizeHeaders');

      const operations = await service.listWorkbookOperations('user-1', 'project-1');
      expect(operations.some((operation: any) => operation.type === 'freezePane')).toBe(true);
      expect(operations.some((operation: any) => operation.type === 'formatRange')).toBe(true);

      const enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      const zip = new AdmZip(Buffer.from(enhanced.body));
      const sheetXml = zip.readAsText('xl/worksheets/sheet1.xml');
      expect(sheetXml).toContain('state="frozen"');
    } finally {
      cleanup();
    }
  });

  it('preserves worksheet metadata when inserting rows and columns', async () => {
    const { project, cleanup } = createWorkbookProject();
    const prisma = createMemoryPrisma(project);
    const service: any = new ExcelStudioService(
      prisma as any,
      { record: async () => null } as any,
      {
        recordImport: async () => ({ imported: 0 }),
        recordExport: async () => 0,
        recordReopen: async () => ({ reopened: 0, mutated: 0, lost: 0 }),
      } as any,
    );
    try {
      await service.createWorkbookOperation('user-1', 'project-1', {
        type: 'insertRow',
        sheetName: 'Model',
        target: { index: 1 },
        payload: { count: 1 },
      });
      await service.createWorkbookOperation('user-1', 'project-1', {
        type: 'insertColumn',
        sheetName: 'Model',
        target: { index: 1 },
        payload: { count: 1 },
      });

      const enhanced = await service.exportProject('user-1', 'project-1', 'enhanced-xlsx');
      const workbook = XLSX.read(enhanced.body, { type: 'buffer', cellStyles: true });
      const sheet: any = workbook.Sheets.Model;
      expect(XLSX.utils.encode_range(sheet['!merges'][0])).toBe('A1:C1');
      expect(sheet['!cols'][0]?.wch || sheet['!cols'][0]?.width).toBeTruthy();
      expect(sheet['!cols'][2]?.wch || sheet['!cols'][2]?.width).toBeTruthy();
      expect(sheet['!rows'][0]?.hpt || sheet['!rows'][0]?.hpx).toBeTruthy();
      expect(sheet['!rows'][2]?.hpt || sheet['!rows'][2]?.hpx).toBeTruthy();
    } finally {
      cleanup();
    }
  });
});
