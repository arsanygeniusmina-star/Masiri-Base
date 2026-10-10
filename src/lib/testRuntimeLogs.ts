export type TestRuntimeLog = {
  id: number;
  time: string;
  level: 'error' | 'warning';
  message: string;
};

const MAX_LOGS = 200;
const entries: TestRuntimeLog[] = [];
let nextId = 1;
let started = false;

function safeMessage(value: unknown): string {
  let message: string;
  if (value instanceof Error) {
    message = value.name + ': ' + value.message;
  } else if (typeof value === 'string') {
    message = value;
  } else if (value && typeof value === 'object') {
    const candidate = value as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
    if (typeof candidate.message === 'string') {
      message = [
        typeof candidate.name === 'string' ? candidate.name : '',
        candidate.message,
        typeof candidate.code === 'string' ? 'code=' + candidate.code : '',
        typeof candidate.status === 'number' ? 'status=' + candidate.status : '',
      ].filter(Boolean).join(': ');
    } else {
      message = Object.prototype.toString.call(value);
    }
  } else {
    message = String(value);
  }

  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/(password|token|secret|api[_ -]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g, '[token redacted]')
    .slice(0, 700);
}

function add(level: TestRuntimeLog['level'], message: string) {
  entries.push({ id: nextId++, time: new Date().toISOString(), level, message });
  if (entries.length > MAX_LOGS) entries.splice(0, entries.length - MAX_LOGS);
}

export function startTestRuntimeLogCapture() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    add('error', args.map(safeMessage).join(' ').slice(0, 700));
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    add('warning', args.map(safeMessage).join(' ').slice(0, 700));
    originalWarn(...args);
  };
  window.addEventListener('error', (event) => {
    add('error', safeMessage(event.message || 'Browser runtime error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    add('error', 'Unhandled promise rejection: ' + safeMessage(event.reason));
  });
}

export function getTestRuntimeLogs(): TestRuntimeLog[] {
  return entries.slice().reverse();
}

export function clearTestRuntimeLogs() {
  entries.length = 0;
}
