import api from '@/lib/api';
import type {
  ExcelProject,
  ExcelReports,
  ExcelScriptAnalysis,
  ExcelTemplate,
  ExcelWorkbookDiff,
  ExcelWorkbookOperationInput,
  ExcelWorkbookOperationRecord,
  ExcelWorkbookSnapshotRecord,
} from './types';

function unwrapData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function unwrapArray<T>(payload: any, fallbackKeys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  for (const key of fallbackKeys) {
    if (Array.isArray(payload?.[key])) return payload[key] as T[];
  }
  return [];
}

export async function listExcelProjects() {
  const response = await api.get('/excel-studio/projects');
  return unwrapArray<ExcelProject>(response.data, ['projects']);
}

export async function getExcelProject(id: string) {
  const response = await api.get(`/excel-studio/projects/${id}`);
  return unwrapData<ExcelProject>(response.data);
}

export async function uploadExcelWorkbook(file: File, onProgress?: (progress: number) => void) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post('/excel-studio/projects/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });
  return unwrapData<ExcelProject>(response.data);
}

export async function analyzeExcelScript(script: string) {
  const response = await api.post<{ success: true; data: ExcelScriptAnalysis }>('/excel-studio/smart-builder/analyze', { script });
  return response.data.data;
}

export async function generateExcelFromScript(input: { script: string; title?: string; templateId?: string }) {
  const response = await api.post('/excel-studio/smart-builder/generate', input);
  return unwrapData<ExcelProject>(response.data);
}

export async function updateExcelProject(id: string, patch: Partial<ExcelProject>) {
  const response = await api.patch(`/excel-studio/projects/${id}`, patch);
  return unwrapData<ExcelProject>(response.data);
}

export async function duplicateExcelProject(id: string) {
  const response = await api.post(`/excel-studio/projects/${id}/duplicate`);
  return unwrapData<ExcelProject>(response.data);
}

export async function archiveExcelProject(id: string) {
  const response = await api.post<{ ok: true }>(`/excel-studio/projects/${id}/archive`);
  return response.data;
}

export async function enhanceExcelProject(id: string, templateId?: string) {
  const response = await api.post(`/excel-studio/projects/${id}/enhance`, { templateId });
  return unwrapData<ExcelProject>(response.data);
}

export async function applyExcelAction(id: string, action: string) {
  const response = await api.post(`/excel-studio/projects/${id}/actions`, { action });
  return unwrapData<ExcelProject>(response.data);
}

export async function listExcelWorkbookOperations(id: string) {
  const response = await api.get(`/excel-studio/projects/${id}/operations`);
  return unwrapArray<ExcelWorkbookOperationRecord>(response.data, ['operations']);
}

export async function createExcelWorkbookOperation(id: string, operation: ExcelWorkbookOperationInput) {
  const response = await api.post(`/excel-studio/projects/${id}/operations`, operation);
  return unwrapData<ExcelWorkbookOperationRecord>(response.data);
}

export async function undoExcelWorkbookOperation(id: string) {
  const response = await api.post(`/excel-studio/projects/${id}/undo`);
  return unwrapData<ExcelWorkbookOperationRecord>(response.data);
}

export async function redoExcelWorkbookOperation(id: string) {
  const response = await api.post(`/excel-studio/projects/${id}/redo`);
  return unwrapData<ExcelWorkbookOperationRecord>(response.data);
}

export async function listExcelWorkbookSnapshots(id: string) {
  const response = await api.get(`/excel-studio/projects/${id}/snapshots`);
  return unwrapArray<ExcelWorkbookSnapshotRecord>(response.data, ['snapshots']);
}

export async function createExcelWorkbookSnapshot(id: string, label?: string) {
  const response = await api.post(`/excel-studio/projects/${id}/snapshots`, { label });
  return unwrapData<ExcelWorkbookSnapshotRecord>(response.data);
}

export async function restoreExcelWorkbookSnapshot(id: string, snapshotId: string) {
  const response = await api.post(`/excel-studio/projects/${id}/snapshots/${snapshotId}/restore`);
  return unwrapData<ExcelProject>(response.data);
}

export async function compareExcelWorkbookSnapshots(id: string, before: string, after: string) {
  const response = await api.get<ExcelWorkbookDiff>(`/excel-studio/projects/${id}/snapshots/compare`, { params: { before, after } });
  return response.data;
}

export async function listExcelTemplates() {
  const response = await api.get('/excel-studio/templates');
  return unwrapArray<ExcelTemplate>(response.data, ['templates']);
}

export async function getExcelReports() {
  const response = await api.get<ExcelReports>('/excel-studio/reports');
  return response.data;
}

export type ExcelExportFormat =
  | 'json'
  | 'csv'
  | 'xlsx'
  | 'enhanced-xlsx'
  | 'original-xlsx'
  | 'comparison-xlsx'
  | 'before-after-xlsx'
  | 'board-package-xlsx'
  | 'audit-csv'
  | 'change-log'
  | 'issue-report'
  | 'audit-pdf'
  | 'executive-pdf'
  | 'dashboard-pdf';

export function excelExportUrl(id: string, format: ExcelExportFormat = 'json') {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return `${base.replace(/\/$/, '')}/excel-studio/projects/${id}/export?format=${format}`;
}
