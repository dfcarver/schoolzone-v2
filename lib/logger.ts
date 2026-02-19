export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown;
}

const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER = 200;

function now(): string {
  return new Date().toISOString();
}

function push(entry: LogEntry): void {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) {
    LOG_BUFFER.shift();
  }
}

export function debug(message: string, data?: unknown): void {
  push({ level: "debug", timestamp: now(), message, data });
}

export function info(message: string, data?: unknown): void {
  push({ level: "info", timestamp: now(), message, data });
}

export function warn(message: string, data?: unknown): void {
  push({ level: "warn", timestamp: now(), message, data });
}

export function error(message: string, data?: unknown): void {
  push({ level: "error", timestamp: now(), message, data });
}

export function getLogBuffer(): readonly LogEntry[] {
  return LOG_BUFFER;
}

export function clearLogBuffer(): void {
  LOG_BUFFER.length = 0;
}
