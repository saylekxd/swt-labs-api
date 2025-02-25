type LogLevel = 'info' | 'error' | 'warn' | 'debug';

const getEmoji = (level: LogLevel): string => {
  switch (level) {
    case 'info': return '📝';
    case 'error': return '❌';
    case 'warn': return '⚠️';
    case 'debug': return '🔍';
  }
};

const formatData = (data: unknown): string => {
  if (data === undefined || data === '') {
    return '';
  }
  if (data instanceof Error) {
    return data.stack || data.message;
  }
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
};

export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`${getEmoji('info')} ${message}`, formatData(data));
  },
  error: (message: string, error?: unknown) => {
    console.error(`${getEmoji('error')} ${message}`, formatData(error));
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`${getEmoji('warn')} ${message}`, formatData(data));
  },
  debug: (message: string, data?: unknown) => {
    console.debug(`${getEmoji('debug')} ${message}`, formatData(data));
  }
}; 