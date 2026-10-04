import { env } from 'cloudflare:workers';

export function runtimeString(name: string) {
  const workerValue = (env as Record<string, unknown>)[name];
  if (typeof workerValue === 'string' && workerValue) return workerValue;
  const processValue = process.env[name];
  return typeof processValue === 'string' && processValue ? processValue : undefined;
}
