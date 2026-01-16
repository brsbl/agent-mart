// Data URLs
export const DATA_URLS = {
  PLUGINS_BROWSE: '/data/plugins-browse.json',
  MARKETPLACES_BROWSE: '/data/marketplaces-browse.json',
  AUTHOR: (authorId: string) => `/data/authors/${authorId}.json`,
} as const;

// UI Constants
export const DEFAULT_COPY_FEEDBACK_DURATION = 2000;
export const MAX_CATEGORY_PLUGINS = 12;
