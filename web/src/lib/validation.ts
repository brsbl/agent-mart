/**
 * Maximum allowed length for URL parameters to prevent DoS attacks.
 */
const MAX_PARAM_LENGTH = 256;

/**
 * Validates a URL parameter to prevent path traversal attacks.
 * Returns the sanitized value or null if invalid.
 */
export function validateUrlParam(param: string | string[] | undefined): string | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value || typeof value !== "string") {
    return null;
  }

  // Check length before processing to prevent DoS
  if (value.length > MAX_PARAM_LENGTH) {
    return null;
  }

  // Decode the parameter to catch encoded traversal attempts
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  // Check decoded length as well
  if (decoded.length > MAX_PARAM_LENGTH) {
    return null;
  }

  // Check for path traversal patterns
  if (
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    return null;
  }

  // Only allow alphanumeric, hyphens, underscores, and dots (for valid GitHub usernames/repo names)
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validPattern.test(decoded)) {
    return null;
  }

  return decoded;
}
