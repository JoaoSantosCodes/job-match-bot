/**
 * Retries an asynchronous function with exponential backoff.
 *
 * @param fn The function to execute.
 * @param maxRetries Maximum number of retry attempts.
 * @param delay Initial delay in milliseconds.
 * @param factor Exponential growth factor.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  factor: number = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const isRetryable = isErrorRetryable(error);
      
      if (attempt > maxRetries || !isRetryable) {
        throw error;
      }
      
      const currentDelay = delay * Math.pow(factor, attempt - 1);
      console.warn(
        `Gemini API call failed (Attempt ${attempt}/${maxRetries}). Retrying in ${currentDelay}ms. Error:`,
        error.message || error
      );
      
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
}

/**
 * Checks if the thrown error indicates a rate limit, server error, or transient network issue.
 */
function isErrorRetryable(error: any): boolean {
  // If we have an HTTP status code
  const status = error.status || (error.error && error.error.code);
  if (status === 429 || (status >= 500 && status < 600)) {
    return true;
  }
  
  // Inspect message content for typical transient errors
  const message = (error.message || '').toLowerCase();
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('too many requests') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('socket hung up')
  ) {
    return true;
  }
  
  return false;
}
