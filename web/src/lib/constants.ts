// Data URLs
export const DATA_URLS = {
  PLUGINS_BROWSE: '/data/plugins-browse.json',
  OWNER: (ownerId: string) => `/data/owners/${ownerId}.json`,
} as const;

// UI Constants
export const DEFAULT_COPY_FEEDBACK_DURATION = 2000;
export const MAX_CATEGORY_PLUGINS = 12;
