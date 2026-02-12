/** Shared drop reason constants for pipeline steps and tests */
export const DROP_DELETED = 'deleted (404)';
export const DROP_FAILED = 'failed after retries';
export const DROP_INVALID_MARKETPLACE = 'no valid marketplace.json';
export const DROP_INVALID_FULLNAME = 'invalid full_name';

/** Check if a drop reason is acceptable (expected, not a pipeline failure) */
export function isAcceptableDrop(reason) {
  return reason.includes('404') || reason.includes('no valid marketplace.json');
}
