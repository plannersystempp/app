import { ErrorInfo } from 'react';

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'page' | 'section' | 'component';
  component: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
    componentStack?: string;
    props?: Record<string, any>;
  };
  metadata: {
    retryCount?: number;
    previousErrors?: string[];
    performanceMetrics?: {
      memoryUsage?: number;
      loadTime?: number;
    };
  };
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: ErrorReport[];
  criticalErrors: ErrorReport[];
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private sessionId: string;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;
  // Limite mais conservador para evitar QuotaExceeded em dev
  private maxStorageSize = 200;
  private pruneBatchSize = 20;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorReporting();
  }

  public static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorReporting() {
    // Capturar erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      this.reportError({
        error: new Error(event.message),
        level: 'page',
        component: 'Global',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Capturar promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        error: new Error(`Unhandled Promise Rejection: ${event.reason}`),
        level: 'page',
        component: 'Promise',
        context: {
          reason: event.reason
        }
      });
    });

    // Limpar erros antigos periodicamente
    setInterval(() => {
      this.cleanupOldErrors();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  public reportError({
    error,
    errorInfo,
    level = 'component',
    component = 'Unknown',
    context = {},
    metadata = {}
  }: {
    error: Error;
    errorInfo?: ErrorInfo;
    level?: 'page' | 'section' | 'component';
    component?: string;
    context?: Record<string, any>;
    metadata?: Record<string, any>;
  }): string {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      level,
      component,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: this.getCurrentUserId(),
        sessionId: this.sessionId,
        componentStack: errorInfo?.componentStack,
        ...context
      },
      metadata: {
        performanceMetrics: this.getPerformanceMetrics(),
        ...metadata
      }
    };

    // Adicionar à fila de erros
    this.errorQueue.push(errorReport);
    
    // Manter apenas os erros mais recentes na fila
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Salvar no localStorage
    this.saveErrorToStorage(errorReport);

    // Log detalhado no console
    this.logErrorToConsole(errorReport);

    // Enviar para serviços externos (se configurado)
    this.sendToExternalServices(errorReport);

    return errorId;
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Tentar obter o ID do usuário do localStorage ou contexto
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.email;
      }
    } catch (error) {
      console.warn('Failed to get user ID:', error);
    }
    return undefined;
  }

  private getPerformanceMetrics() {
    try {
      const memory = (performance as any).memory;
      return {
        memoryUsage: memory ? memory.usedJSHeapSize : undefined,
        loadTime: performance.now()
      };
    } catch (error) {
      return {};
    }
  }

  private saveErrorToStorage(errorReport: ErrorReport) {
    const storageKey = `error_${errorReport.id}`;
    const payload = this.safeStringify(errorReport);

    const pruneOldest = (count: number) => {
      try {
        const errorKeys = Object.keys(localStorage).filter(key => key.startsWith('error_'));
        const errorEntries = errorKeys.map(key => {
          const data = localStorage.getItem(key);
          return data ? { key, data: JSON.parse(data) } : null;
        }).filter(Boolean) as Array<{ key: string; data: any }>;

        errorEntries.sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime());
        const toRemove = errorEntries.slice(0, Math.min(count, errorEntries.length));
        toRemove.forEach(entry => localStorage.removeItem(entry.key));
      } catch (err) {
        console.warn('Error while pruning old error entries:', err);
      }
    };

    try {
      // Pre-prune se já está acima do limite
      const errorKeys = Object.keys(localStorage).filter(key => key.startsWith('error_'));
      if (errorKeys.length >= this.maxStorageSize) {
        pruneOldest(this.pruneBatchSize);
      }

      localStorage.setItem(storageKey, payload);
    } catch (error: any) {
      const isQuotaError = typeof error === 'object' && error && (
        (error.name && error.name.includes('QuotaExceeded')) ||
        (error.message && error.message.includes('QuotaExceeded'))
      );

      if (isQuotaError) {
        // Tenta liberar espaço e escrever novamente
        pruneOldest(this.pruneBatchSize);
        try {
          localStorage.setItem(storageKey, payload);
        } catch (retryError) {
          // Fallback para sessionStorage para não perder o reporte durante a sessão
          try {
            sessionStorage.setItem(storageKey, payload);
            console.warn('Quota exceeded on localStorage. Stored error in sessionStorage:', storageKey);
          } catch (fallbackError) {
            console.error('Failed to store error even in sessionStorage:', fallbackError);
          }
        }
      } else {
        console.error('Failed to save error to storage:', error);
      }
    }
  }

  private logErrorToConsole(errorReport: ErrorReport) {
    const levelEmojis = {
      page: '🚨',
      section: '⚠️',
      component: '🔧'
    };

    console.group(`${levelEmojis[errorReport.level]} Error Report - ${errorReport.component}`);
    console.error('Error ID:', errorReport.id);
    console.error('Level:', errorReport.level);
    console.error('Component:', errorReport.component);
    console.error('Message:', errorReport.error.message);
    console.error('Stack:', errorReport.error.stack);
    console.error('Context:', errorReport.context);
    console.error('Metadata:', errorReport.metadata);
    console.groupEnd();
  }

  private async sendToExternalServices(errorReport: ErrorReport) {
    // Aqui você pode integrar com serviços como:
    // - Sentry
    // - LogRocket
    // - Bugsnag
    // - DataDog
    // - Custom API endpoint

    try {
      // Exemplo de integração com API personalizada
      if (import.meta.env.MODE === 'production' && window.navigator.onLine) {
        // await fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(errorReport)
        // });
        
        console.log('📊 Error would be sent to monitoring service:', errorReport.id);
      }
    } catch (error) {
      console.error('Failed to send error to external services:', error);
    }
  }

  private cleanupOldErrors() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias
      const errorKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('error_')
      );

      errorKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const errorReport = JSON.parse(data);
          const errorTime = new Date(errorReport.timestamp).getTime();
          if (errorTime < cutoffTime) {
            localStorage.removeItem(key);
          }
        }
      });

      console.log('🧹 Cleaned up old error reports');
    } catch (error) {
      console.error('Failed to cleanup old errors:', error);
    }
  }

  public getErrorMetrics(): ErrorMetrics {
    try {
      const errorKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('error_')
      );

      const errors: ErrorReport[] = errorKeys.map(key => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }).filter(Boolean);

      const recentErrors = errors
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

      const criticalErrors = errors.filter(error => 
        error.level === 'page' || error.error.message.includes('Critical')
      );

      const errorsByLevel = errors.reduce((acc, error) => {
        acc[error.level] = (acc[error.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const errorsByComponent = errors.reduce((acc, error) => {
        acc[error.component] = (acc[error.component] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const errorsByType = errors.reduce((acc, error) => {
        acc[error.error.name] = (acc[error.error.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalErrors: errors.length,
        errorsByLevel,
        errorsByComponent,
        errorsByType,
        recentErrors,
        criticalErrors
      };
    } catch (error) {
      console.error('Failed to get error metrics:', error);
      return {
        totalErrors: 0,
        errorsByLevel: {},
        errorsByComponent: {},
        errorsByType: {},
        recentErrors: [],
        criticalErrors: []
      };
    }
  }

  public clearAllErrors() {
    try {
      const errorKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('error_')
      );
      
      errorKeys.forEach(key => localStorage.removeItem(key));
      this.errorQueue = [];
      
      console.log('🗑️ All error reports cleared');
    } catch (error) {
      console.error('Failed to clear errors:', error);
    }
  }

  public exportErrors(): string {
    try {
      const metrics = this.getErrorMetrics();
      return this.safeStringify(metrics);
    } catch (error) {
      console.error('Failed to export errors:', error);
      return '{}';
    }
  }

  // Método safeStringify declarado para TypeScript
  private safeStringify(obj: any): string {
    const cache = new WeakSet();
    const replacer = (key: string, value: any) => {
      if (typeof value === 'function' || typeof value === 'symbol') return undefined;
      if (value instanceof Error) {
        return { message: value.message, stack: value.stack, name: value.name };
      }
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    };
    return JSON.stringify(obj, replacer);
  }
}

// Instância singleton
export const errorReporting = ErrorReportingService.getInstance();

// Hook para usar o serviço de relatório de erros
export const useErrorReporting = () => {
  return {
    reportError: errorReporting.reportError.bind(errorReporting),
    getMetrics: errorReporting.getErrorMetrics.bind(errorReporting),
    clearErrors: errorReporting.clearAllErrors.bind(errorReporting),
    exportErrors: errorReporting.exportErrors.bind(errorReporting)
  };
};

// Helper: stringify seguro para evitar loops e tipos não serializáveis
// Mantém erros como objetos simples com message/stack/name
(ErrorReportingService as any).prototype.safeStringify = function(obj: any): string {
  const cache = new WeakSet();
  const replacer = (key: string, value: any) => {
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    if (value instanceof Error) {
      return { message: value.message, stack: value.stack, name: value.name };
    }
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) return '[Circular]';
      cache.add(value);
    }
    return value;
  };
  try {
    return JSON.stringify(obj, replacer, 2);
  } catch {
    return '{}';
  }
};