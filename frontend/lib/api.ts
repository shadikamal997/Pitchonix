import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { parseApiError, AppError, isRetryable, sleep, logError, DEFAULT_RETRY_CONFIG } from './errors';

// Guard so simultaneous 401s from multiple in-flight requests only trigger
// one redirect instead of a rapid-fire navigation loop that freezes the browser.
let _redirectingToLogin = false;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    const appError = parseApiError(error);
    logError(appError, 'Request Error');
    return Promise.reject(appError);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If the error response is a Blob (happens when responseType: 'blob' is set),
    // parse it to get the actual error message
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const data = JSON.parse(text);
        // Replace the Blob with the parsed JSON so parseApiError can read it
        error.response.data = data;
      } catch {
        // If we can't parse the Blob, leave it as is
      }
    }

    const appError = parseApiError(error);
    logError(appError, 'Response Error');

    // Handle 401 Unauthorized — deduped so concurrent 401s don't cause a
    // rapid-fire navigation loop that freezes the browser.
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Auth endpoints (login/register/magic-link) use 401 to mean "wrong
        // credentials" — not an expired session. Skip session cleanup so the
        // login form can display the actual backend error message.
        const requestUrl = error.config?.url ?? '';
        const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/magic-link', '/auth/verify'].some(
          (p) => requestUrl.includes(p)
        );

        if (!isAuthEndpoint) {
          // Expired session — clear stale auth state.
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          document.cookie = 'pitchonix-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
          try { localStorage.removeItem('auth-storage'); } catch { /* */ }

          // Only navigate to /login if not already on an auth page — prevents
          // the WorkspaceProvider (in root layout) from 401-looping on /login.
          const onAuthPage = ['/login', '/register'].some((p) => window.location.pathname.startsWith(p));
          if (!onAuthPage && !_redirectingToLogin) {
            _redirectingToLogin = true;
            window.location.replace('/login');
            setTimeout(() => { _redirectingToLogin = false; }, 3000);
          }
        }
      }
    }

    return Promise.reject(appError);
  }
);

/**
 * Make API request with automatic retry logic
 */
export async function apiRequest<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const appError = error instanceof AppError ? error : parseApiError(error);
      lastError = appError;

      // Don't retry if error is not retryable
      if (!isRetryable(appError)) {
        throw appError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw appError;
      }

      // Notify about retry
      if (options?.onRetry) {
        options.onRetry(attempt + 1, appError);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = DEFAULT_RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Type-safe API wrapper with error handling
 */
export const apiService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  async uploadDocument<T>(file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<T>('/document-parser/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  async analyzeContent<T>(content: string, type: string, context?: any): Promise<T> {
    const response = await api.post<T>('/intelligence/analyze', {
      content,
      type,
      context,
    });
    return response.data;
  },

  async quickCheck(content: string): Promise<{ score: number; issues: string[] }> {
    const response = await api.post('/intelligence/quick-check', { content });
    return response.data;
  },

  async enhanceContent(content: string, type: string): Promise<{ enhanced: string }> {
    const response = await api.post('/intelligence/enhance', { content, type });
    return response.data;
  },

  // Storytelling AI
  async transformToStory<T = any>(data: any): Promise<T> {
    const response = await api.post('/storytelling/transform', data);
    return response.data;
  },

  async generateMetaphors<T = any>(concept: string, industry?: string, targetAudience?: string): Promise<T> {
    const response = await api.post('/storytelling/metaphors', {
      concept,
      industry,
      targetAudience,
    });
    return response.data;
  },

  async createTension<T = any>(content: string, contentType?: string, context?: any): Promise<T> {
    const response = await api.post('/storytelling/tension', {
      content,
      contentType,
      context,
    });
    return response.data;
  },

  // Visual Intelligence
  async analyzeSlideContent<T = any>(data: any): Promise<T> {
    const response = await api.post('/visual-intelligence/analyze', data);
    return response.data;
  },

  async generateChartData<T = any>(description: string, chartType: string, dataPoints?: number): Promise<T> {
    const response = await api.post('/visual-intelligence/generate-chart', {
      description,
      chartType,
      dataPoints,
    });
    return response.data;
  },
};

export default api;
