/**
 * Shared utilities extracted from api.js to eliminate duplication.
 */

const DEFAULT_TIMEOUT_MS = 300_000;

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
