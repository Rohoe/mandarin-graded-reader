/**
 * Shared utilities extracted from api.js to eliminate duplication.
 */

const DEFAULT_TIMEOUT_MS = 300_000;

export function isRetryable(status) {
  return status >= 500 || status === 429;
}

// ── Shared retry logic ─────────────────────────────────────────

const MAX_RETRIES   = 2;
const BASE_DELAY_MS = 1000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry: shared across all providers.
 * @param {string} url
 * @param {object} options - fetch options (may include signal)
 * @param {function} extractText - (responseData) => string
 * @param {string} providerLabel - for error messages
 */
export async function fetchWithRetry(url, options, extractText, providerLabel) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let msg = `[${providerLabel}] API error ${response.status}`;
        try {
          const err = await response.json();
          msg = err.error?.message || err.message || msg;
        } catch { /* ignore */ }
        const error = new Error(msg);
        error.status = response.status;

        if (!isRetryable(response.status) || attempt === MAX_RETRIES) throw error;
        lastError = error;
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[${providerLabel}] ${response.status} on attempt ${attempt + 1}, retrying in ${backoff}ms…`);
        await delay(backoff);
        continue;
      }

      const data = await response.json();
      return extractText(data);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out. Try again or switch to a faster provider.');
      if (err.status !== undefined) throw err;
      if (attempt === MAX_RETRIES) throw err;
      lastError = err;
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[${providerLabel}] Network error on attempt ${attempt + 1}, retrying in ${backoff}ms…`, err.message);
      await delay(backoff);
    }
  }

  throw lastError;
}

/**
 * Creates an AbortController with a timeout, optionally linked to an external signal.
 * @param {AbortSignal} [externalSignal] - Optional external AbortSignal to link
 * @param {number} [timeoutMs] - Timeout in milliseconds (default: 300s)
 * @returns {{ signal: AbortSignal, cleanup: () => void }}
 */
export function createTimeoutController(externalSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      externalSignal.addEventListener(
        'abort',
        () => { clearTimeout(timeoutId); controller.abort(); },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Parse a raw LLM response as JSON, with fallback for markdown fences and
 * embedded JSON objects/arrays.
 *
 * @param {string} raw - Raw text from LLM
 * @param {string} errorMessage - Message to throw if parsing fails entirely
 * @returns {any} Parsed JSON value
 */
export function parseJSONWithFallback(raw, errorMessage) {
  let result;
  try {
    result = JSON.parse(raw.trim());
  } catch {
    // Try extracting both object and array, prefer whichever captured more text
    let objResult = null, objLen = 0;
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { objResult = JSON.parse(objMatch[0]); objLen = objMatch[0].length; } catch { /* fall through */ }
    }
    let arrResult = null, arrLen = 0;
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { arrResult = JSON.parse(arrMatch[0]); arrLen = arrMatch[0].length; } catch { /* fall through */ }
    }
    if (objResult && arrResult) {
      result = arrLen >= objLen ? arrResult : objResult;
    } else {
      result = objResult || arrResult;
    }
    if (!result) throw new Error(errorMessage);
  }
  return result;
}
