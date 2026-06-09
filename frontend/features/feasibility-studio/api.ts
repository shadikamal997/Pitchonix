import api from '@/lib/api';
import type { FeasibilityAnalysis, FeasibilityProject, FeasibilityTemplate } from './types';

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

export async function listFeasibilityTemplates() {
  const response = await api.get('/feasibility-studio/templates');
  return unwrapArray<FeasibilityTemplate>(response.data, ['templates']);
}

export async function analyzeFeasibility(input: {
  rawContent: string;
  title?: string;
  industry?: string;
  studyType?: string;
}) {
  const response = await api.post<{ success: true; data: FeasibilityAnalysis }>('/feasibility-studio/analyze', input);
  return response.data.data;
}

export async function listFeasibilityProjects() {
  const response = await api.get('/feasibility-studio/projects');
  return unwrapArray<FeasibilityProject>(response.data, ['projects']);
}

export async function createFeasibilityProject(input: {
  rawContent: string;
  title?: string;
  description?: string;
  industry?: string;
  studyType?: string;
  templateId?: string;
  brandKitId?: string | null;
}) {
  const response = await api.post('/feasibility-studio/projects', input);
  return unwrapData<FeasibilityProject>(response.data);
}

export async function getFeasibilityProject(id: string) {
  const response = await api.get(`/feasibility-studio/projects/${id}`);
  return unwrapData<FeasibilityProject>(response.data);
}

export async function enhanceFeasibilityProject(id: string) {
  const response = await api.post(`/feasibility-studio/projects/${id}/enhance`);
  return unwrapData<FeasibilityProject>(response.data);
}

export async function duplicateFeasibilityProject(id: string) {
  const response = await api.post(`/feasibility-studio/projects/${id}/duplicate`);
  return unwrapData<FeasibilityProject>(response.data);
}

export async function archiveFeasibilityProject(id: string) {
  const response = await api.post<{ ok: true }>(`/feasibility-studio/projects/${id}/archive`);
  return response.data;
}

export async function deleteFeasibilityProject(id: string) {
  const response = await api.delete<{ ok: true }>(`/feasibility-studio/projects/${id}`);
  return response.data;
}

export async function getFeasibilityOutputs(id: string) {
  const response = await api.get(`/feasibility-studio/projects/${id}/outputs`);
  return response.data;
}

export async function importFeasibilityFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post('/document-parser/extract-text', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as { html?: string; text?: string; metadata?: any };
}
