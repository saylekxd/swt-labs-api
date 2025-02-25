export interface EstimationRequest {
  projectName: string;
  description: string;
  timeline: string;
  selectedFeatures: string[];
  projectType: string;
  complexity: number;
  email: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  required?: string[];
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  openaiConfigured?: boolean;
  timestamp?: string;
}

export interface EstimationResponse {
  estimation: string;
} 