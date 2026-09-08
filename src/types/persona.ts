// Persona SDK Types
export interface PersonaClient {
  start: () => void;
  open: () => void;
  close: () => void;
}

export interface PersonaConfig {
  templateId?: string;
  inquiryId?: string;
  environment: 'sandbox' | 'production';
  onComplete?: (inquiryId: string, status: string) => void;
  onCancel?: (inquiryId: string) => void;
  onError?: (error: any) => void;
  onReady?: () => void;
  onStart?: () => void;
  onExit?: () => void;
}

export interface PersonaInquiry {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  templateId: string;
  createdAt: string;
  completedAt?: string;
  attributes?: Record<string, any>;
}

export interface PersonaVerificationState {
  isLoading: boolean;
  isVerifying: boolean;
  inquiryId: string | null;
  status: 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  personaClient: PersonaClient | null;
}

export interface PersonaVerificationResult {
  success: boolean;
  inquiryId?: string;
  status: string;
  error?: string;
  message?: string;
  canRetry?: boolean;
}

// Extend Window interface for Persona
declare global {
  interface Window {
    Persona?: {
      Client: new (config: PersonaConfig) => PersonaClient;
    };
  }
}
