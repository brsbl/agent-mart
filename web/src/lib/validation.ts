/**
 * Validates a URL parameter to prevent path traversal attacks.
 * Returns the sanitized value or null if invalid.
 */
export function validateUrlParam(param: string | undefined): string | null {
  if (!param || typeof param !== "string") {
    return null;
  }

  // Decode the parameter to catch encoded traversal attempts
  let decoded: string;
  try {
    decoded = decodeURIComponent(param);
  } catch {
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
