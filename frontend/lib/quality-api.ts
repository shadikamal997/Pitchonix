/**
 * Quality Control API Client
 * Functions for interacting with Phase 8 quality endpoints
 */

import { api } from './api';
import type {
  QualityReport,
  GenerationStatus,
  ValidationResult,
  ExportReadiness,
  AggregateMetrics,
} from '@/types/quality';

/**
 * Get comprehensive quality report for a deck
 * @param deckId - The ID of the deck to get quality report for
 * @returns Quality report with score, grade, dimensions, validation summary
 */
export async function getQualityReport(deckId: string): Promise<QualityReport> {
  const response = await api.get(`/generate/quality/${deckId}`);
  return response.data;
}

/**
 * Get real-time generation status for a deck
 * Includes progress, current stage, errors, and timing
 * @param deckId - The ID of the deck to get status for
 * @returns Generation status with progress and stage information
 */
export async function getGenerationStatus(deckId: string): Promise<GenerationStatus> {
  const response = await api.get(`/generate/generation-status/${deckId}`);
  return response.data;
}

/**
 * Run validation on a deck and get detailed results
 * @param deckId - The ID of the deck to validate
 * @returns Validation result with issues organized by severity
 */
export async function validateDeck(deckId: string): Promise<ValidationResult> {
  const response = await api.post(`/generate/validate/${deckId}`);
  return response.data;
}

/**
 * Check if a deck is ready for export
 * @param deckId - The ID of the deck to check
 * @returns Export readiness with blockers if not ready
 */
export async function checkExportReadiness(deckId: string): Promise<ExportReadiness> {
  const response = await api.get(`/generate/export-ready/${deckId}`);
  return response.data;
}

/**
 * Get aggregate metrics across all generations (Admin only)
 * @returns System-wide statistics including success rate, average quality, etc.
 */
export async function getAggregateMetrics(): Promise<AggregateMetrics> {
  const response = await api.get('/generate/metrics');
  return response.data;
}

/**
 * Poll generation status until complete or failed
 * @param deckId - The ID of the deck to poll
 * @param onProgress - Callback for each status update
 * @param intervalMs - Polling interval in milliseconds (default: 2000)
 * @returns Final generation status
 */
export async function pollGenerationStatus(
  deckId: string,
  onProgress?: (status: GenerationStatus) => void,
  intervalMs: number = 2000
): Promise<GenerationStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getGenerationStatus(deckId);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }
        
        // Check if generation is complete
        if (status.completed) {
          resolve(status);
          return;
        }
        
        // Check if generation failed
        if (status.status === 'FAILED') {
          reject(new Error('Generation failed'));
          return;
        }
        
        // Continue polling
        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}

/**
 * Wait for export readiness with polling
 * @param deckId - The ID of the deck to check
 * @param onCheck - Callback for each readiness check
 * @param intervalMs - Polling interval in milliseconds (default: 3000)
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 60000)
 * @returns Export readiness when ready or throws timeout error
 */
export async function waitForExportReadiness(
  deckId: string,
  onCheck?: (readiness: ExportReadiness) => void,
  intervalMs: number = 3000,
  timeoutMs: number = 60000
): Promise<ExportReadiness> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timeout waiting for export readiness'));
          return;
        }
        
        const readiness = await checkExportReadiness(deckId);
        
        // Call check callback if provided
        if (onCheck) {
          onCheck(readiness);
        }
        
        // Check if ready
        if (readiness.ready) {
          resolve(readiness);
          return;
        }
        
        // Continue checking
        setTimeout(check, intervalMs);
      } catch (error) {
        reject(error);
      }
    };
    
    check();
  });
}
