// Data URLs
export const DATA_URLS = {
  MARKETPLACES_BROWSE: '/data/marketplaces-browse.json',
  AUTHOR: (authorId: string) => `/data/authors/${authorId}.json`,
} as const;

// UI Constants
export const DEFAULT_COPY_FEEDBACK_DURATION = 2000;
export const MAX_CATEGORY_PLUGINS = 12;
export const INITIAL_DISPLAY_COUNT = 12;
export const LOAD_MORE_COUNT = 12;
