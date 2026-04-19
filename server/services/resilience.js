/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ API RESILIENCE SERVICE - Phase 9: Production Hardening
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose:
 * - Add timeout handling for external API calls
 * - Implement retry logic with exponential backoff
 * - Improve resilience and reduce cascading failures
 * 
 * Features:
 * - Configurable timeouts per request
 * - Exponential backoff retry strategy
 * - Max retry attempts limit
 * - Error logging and categorization
 */

import { logWarn, logError, logDebug } from '../services/loggingService.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second initial delay
  backoffMultiplier: 2, // Exponential backoff
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Retry on these
};

// ═══════════════════════════════════════════════════════════════════════════
// RETRY WITH TIMEOUT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a fetch call with timeout and retry logic
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {object} config - Retry configuration
 * @returns {Promise} Response object
 * 
 * Usage:
 * const response = await fetchWithRetry('https://api.coingecko.com/api/v3/...');
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        finalConfig.timeout
      );

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastResponse = response;

        // Check if response status is retryable
        if (response.ok) {
          logDebug(`✅ API call succeeded (${url})`, { attempt: attempt + 1 });
          return response;
        }

        // Check if we should retry
        if (
          finalConfig.retryableStatusCodes.includes(response.status) &&
          attempt < finalConfig.maxRetries
        ) {
          logWarn(`⚠️  Retryable status ${response.status} from ${url}`, {
            attempt: attempt + 1,
            maxRetries: finalConfig.maxRetries,
          });

          // Wait before retry
          const delayMs = finalConfig.retryDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Non-retryable error or out of retries
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error;

      // Handle timeout error
      if (error.name === 'AbortError') {
        if (attempt < finalConfig.maxRetries) {
          logWarn(`⏱️  Timeout on ${url}, retrying...`, {
            attempt: attempt + 1,
            maxRetries: finalConfig.maxRetries,
            timeout: finalConfig.timeout,
          });

          const delayMs = finalConfig.retryDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }

      // Handle network errors
      if (error.message === 'fetch failed' || error.code === 'ECONNREFUSED') {
        if (attempt < finalConfig.maxRetries) {
          logWarn(`🔌 Network error on ${url}, retrying...`, {
            attempt: attempt + 1,
            maxRetries: finalConfig.maxRetries,
            error: error.message,
          });

          const delayMs = finalConfig.retryDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }

      // Non-retryable error
      throw error;
    }
  }

  // All retries exhausted
  if (lastError) {
    logError(lastError, {
      url,
      attempts: finalConfig.maxRetries + 1,
      errorType: 'API_RETRY_EXHAUSTED',
    });
    throw lastError;
  }

  // Response exists but all retries failed
  if (lastResponse) {
    const error = new Error(`API error: ${lastResponse.status} ${lastResponse.statusText}`);
    error.statusCode = lastResponse.status;
    error.response = lastResponse;
    throw error;
  }

  throw new Error('Unknown error in fetchWithRetry');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMISE TIMEOUT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap a promise with a timeout
 * 
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message on timeout
 * @returns {Promise} Original promise or timeout error
 */
export function promiseWithTimeout(promise, timeoutMs = 10000, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const error = new Error(errorMessage);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs)
    ),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRY WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retry a function with exponential backoff
 * 
 * @param {function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} initialDelayMs - Initial delay between retries
 * @param {number} multiplier - Exponential backoff multiplier
 * @returns {Promise} Result of function
 * 
 * Usage:
 * const result = await retryWithBackoff(
 *   () => someAsyncOperation(),
 *   3,  // max attempts
 *   1000  // initial delay
 * );
 */
export async function retryWithBackoff(
  fn,
  maxAttempts = 3,
  initialDelayMs = 1000,
  multiplier = 2
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logDebug(`Attempt ${attempt}/${maxAttempts}`, { operation: fn.name });
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(multiplier, attempt - 1);
        logWarn(`Operation failed, retrying in ${delayMs}ms...`, {
          attempt,
          maxAttempts,
          error: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logError(lastError, {
    operation: fn.name,
    attempts: maxAttempts,
    errorType: 'RETRY_EXHAUSTED',
  });

  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER PATTERN (SIMPLE)
// ═══════════════════════════════════════════════════════════════════════════

export class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(fn) {
    // Check if circuit should reset
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
        logDebug('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - request rejected');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset on HALF_OPEN or just continue
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logDebug('Circuit breaker closed after successful request');
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logWarn('Circuit breaker OPEN - too many failures', {
          failureCount: this.failureCount,
          threshold: this.failureThreshold,
        });
      }

      throw error;
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  DEFAULT_CONFIG,
  fetchWithRetry,
  promiseWithTimeout,
  retryWithBackoff,
  CircuitBreaker,
};
