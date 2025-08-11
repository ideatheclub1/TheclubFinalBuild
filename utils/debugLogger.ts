import React, { useState, useEffect, useCallback } from 'react';

// =====================================================
// CENTRALIZED DEBUG LOGGING SYSTEM
// =====================================================

export interface DebugLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'PROCESS';
  component: string;
  action: string;
  message: string;
  data?: any;
  duration?: number;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private isEnabled = true;
  private maxLogs = 100;

  // Enable/disable debugging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.info('SYSTEM', 'DEBUG_TOGGLE', `Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Log information
  info(component: string, action: string, message: string, data?: any) {
    this.addLog('INFO', component, action, message, data);
  }

  // Log warnings
  warn(component: string, action: string, message: string, data?: any) {
    this.addLog('WARN', component, action, message, data);
  }

  // Log errors
  error(component: string, action: string, message: string, data?: any) {
    this.addLog('ERROR', component, action, message, data);
  }

  // Log successes
  success(component: string, action: string, message: string, data?: any) {
    this.addLog('SUCCESS', component, action, message, data);
  }

  // Log processes (for tracking ongoing operations)
  process(component: string, action: string, message: string, data?: any) {
    this.addLog('PROCESS', component, action, message, data);
  }

  // Log with timing
  time(component: string, action: string, message: string, startTime: number, data?: any) {
    const duration = Date.now() - startTime;
    this.addLog('SUCCESS', component, action, `${message} (${duration}ms)`, data, duration);
  }

  // Add log entry
  private addLog(level: DebugLog['level'], component: string, action: string, message: string, data?: any, duration?: number) {
    if (!this.isEnabled) return;

    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      message,
      data,
      duration,
    };

    this.logs.push(log);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with colors
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      SUCCESS: '\x1b[32m', // Green
      PROCESS: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level];
    const time = new Date().toLocaleTimeString();
    
    console.log(
      `${color}[${time}] ${level}${reset} | ${component} | ${action} | ${message}${data ? ` | Data: ${JSON.stringify(data, null, 2)}` : ''}`
    );
  }

  // Get all logs
  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.log('🧹 Debug logs cleared');
  }

  // Get logs by component
  getLogsByComponent(component: string): DebugLog[] {
    return this.logs.filter(log => log.component === component);
  }

  // Get logs by level
  getLogsByLevel(level: DebugLog['level']): DebugLog[] {
    return this.logs.filter(log => log.level === level);
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Convenience functions for common operations
export const debug = {
  // Page navigation
  pageLoad: (pageName: string, params?: any) => {
    debugLogger.info('NAVIGATION', 'PAGE_LOAD', `Loading page: ${pageName}`, params);
  },

  pageUnload: (pageName: string) => {
    debugLogger.info('NAVIGATION', 'PAGE_UNLOAD', `Unloading page: ${pageName}`);
  },

  // API calls
  apiCall: (endpoint: string, method: string, params?: any) => {
    debugLogger.process('API', `${method}_${endpoint}`, `Making ${method} request to ${endpoint}`, params);
  },

  apiSuccess: (endpoint: string, method: string, response: any, duration?: number) => {
    debugLogger.success('API', `${method}_${endpoint}`, `API call successful`, { response, duration });
  },

  apiError: (endpoint: string, method: string, error: any) => {
    debugLogger.error('API', `${method}_${endpoint}`, `API call failed`, error);
  },

  // Database operations
  dbQuery: (table: string, operation: string, params?: any) => {
    debugLogger.process('DATABASE', `${operation}_${table}`, `Database ${operation} on ${table}`, params);
  },

  dbSuccess: (table: string, operation: string, result: any, duration?: number) => {
    debugLogger.success('DATABASE', `${operation}_${table}`, `Database operation successful`, { result, duration });
  },

  dbError: (table: string, operation: string, error: any) => {
    debugLogger.error('DATABASE', `${operation}_${table}`, `Database operation failed`, error);
  },

  // User actions
  userAction: (action: string, details?: any) => {
    debugLogger.info('USER', action, `User performed action: ${action}`, details);
  },

  // State changes
  stateChange: (component: string, stateName: string, oldValue: any, newValue: any) => {
    debugLogger.info('STATE', `${component}_${stateName}`, `State changed in ${component}`, { oldValue, newValue });
  },

  // Component lifecycle
  componentMount: (componentName: string, props?: any) => {
    debugLogger.info('COMPONENT', 'MOUNT', `Component mounted: ${componentName}`, props);
  },

  componentUnmount: (componentName: string) => {
    debugLogger.info('COMPONENT', 'UNMOUNT', `Component unmounted: ${componentName}`);
  },

  // Search operations
  searchStart: (query: string, filters?: any) => {
    debugLogger.process('SEARCH', 'START', `Starting search with query: ${query}`, filters);
  },

  searchComplete: (query: string, results: any, duration?: number) => {
    debugLogger.success('SEARCH', 'COMPLETE', `Search completed for: ${query}`, { resultsCount: results?.length, duration });
  },

  searchError: (query: string, error: any) => {
    debugLogger.error('SEARCH', 'ERROR', `Search failed for: ${query}`, error);
  },

  // Authentication
  authLogin: (userId: string) => {
    debugLogger.success('AUTH', 'LOGIN', `User logged in: ${userId}`);
  },

  authLogout: (userId: string) => {
    debugLogger.info('AUTH', 'LOGOUT', `User logged out: ${userId}`);
  },

  authError: (action: string, error: any) => {
    debugLogger.error('AUTH', action, `Authentication error: ${action}`, error);
  },
};

// React Hook for debugging component lifecycle
export const useDebugLogger = (componentName: string) => {
  React.useEffect(() => {
    debug.componentMount(componentName);
    return () => {
      debug.componentUnmount(componentName);
    };
  }, [componentName]);

  return {
    log: (action: string, message: string, data?: any) => {
      debugLogger.info(componentName, action, message, data);
    },
    error: (action: string, message: string, data?: any) => {
      debugLogger.error(componentName, action, message, data);
    },
    success: (action: string, message: string, data?: any) => {
      debugLogger.success(componentName, action, message, data);
    },
    process: (action: string, message: string, data?: any) => {
      debugLogger.process(componentName, action, message, data);
    },
  };
}; 