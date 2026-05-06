/**
 * Export API Client
 * Phase 10: Advanced Export Features
 */

import api from './api';
import {
  ExportTemplate,
  CreateTemplateDto,
  UpdateTemplateDto,
  ExportJob,
  BatchExportStatus,
  ExportOptions,
} from '@/types/export';

/**
 * Get all export templates
 */
export async function getTemplates(): Promise<ExportTemplate[]> {
  const response = await api.get('/export/templates');
  return response.data;
}

/**
 * Get template by ID
 */
export async function getTemplate(id: string): Promise<ExportTemplate> {
  const response = await api.get(`/export/templates/${id}`);
  return response.data;
}

/**
 * Create custom template
 */
export async function createTemplate(data: CreateTemplateDto): Promise<ExportTemplate> {
  const response = await api.post('/export/templates', data);
  return response.data;
}

/**
 * Update template
 */
export async function updateTemplate(
  id: string,
  data: UpdateTemplateDto
): Promise<ExportTemplate> {
  const response = await api.patch(`/export/templates/${id}`, data);
  return response.data;
}

/**
 * Delete template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/export/templates/${id}`);
}

/**
 * Export deck with options
 */
export async function exportDeck(
  deckId: string,
  format: 'pptx' | 'pdf' | 'html',
  templateId?: string,
  options?: ExportOptions
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  const response = await api.post(`/export/decks/${deckId}/export`, {
    deckId,
    format,
    templateId,
    options: options || {},
  });
  return response.data;
}

/**
 * Create batch export job
 */
export async function createBatchExport(
  deckIds: string[],
  format: 'pptx' | 'pdf' | 'html',
  templateId?: string,
  options?: ExportOptions
): Promise<ExportJob> {
  const response = await api.post('/export/batch', {
    deckIds,
    format,
    templateId,
    options: options || {},
  });
  return response.data;
}

/**
 * Get batch export job status
 */
export async function getBatchStatus(jobId: string): Promise<BatchExportStatus> {
  const response = await api.get(`/export/batch/${jobId}`);
  return response.data;
}

/**
 * Cancel batch export job
 */
export async function cancelBatchExport(jobId: string): Promise<void> {
  await api.delete(`/export/batch/${jobId}`);
}

/**
 * Retry failed batch export job
 */
export async function retryBatchExport(jobId: string): Promise<ExportJob> {
  const response = await api.post(`/export/batch/${jobId}/retry`);
  return response.data;
}

/**
 * Download batch export results
 */
export async function downloadBatchExport(
  jobId: string
): Promise<{ files: string[]; totalFiles: number }> {
  const response = await api.get(`/export/batch/${jobId}/download`);
  return response.data;
}

/**
 * Poll batch export status until completion
 */
export async function pollBatchExport(
  jobId: string,
  onProgress?: (status: BatchExportStatus) => void,
  intervalMs: number = 2000
): Promise<BatchExportStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getBatchStatus(jobId);
        
        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed') {
          resolve(status);
        } else if (status.status === 'failed') {
          reject(new Error('Batch export failed'));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}
