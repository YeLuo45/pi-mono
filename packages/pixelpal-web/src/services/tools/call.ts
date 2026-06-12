export async function callWithTimeout<T>(coro: Promise<T>, timeout_ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Tool call timed out after ${timeout_ms}ms`)), timeout_ms);
  });
  try {
    return await Promise.race([coro, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
