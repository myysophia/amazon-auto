const attachTimestamp = <T extends (...args: any[]) => void>(fn: T) =>
  ((...args: Parameters<T>) => fn(`[${new Date().toISOString()}]`, ...args)) as T;

const flag = '__console_timestamp_patched__';

if (!(globalThis as any)[flag]) {
  console.log = attachTimestamp(console.log.bind(console));
  console.warn = attachTimestamp(console.warn.bind(console));
  console.error = attachTimestamp(console.error.bind(console));
  (globalThis as any)[flag] = true;
}

export {};

