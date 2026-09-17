// Build-time environment tag — set VITE_APP_ENV=dev when running/building
// the dev or staging deployment (e.g. in that environment's .env or the
// docker build args) to reveal dev-only UI. Not set (or any other value)
// in a real production build, so this defaults closed rather than open.
export const isDevEnv = import.meta.env.VITE_APP_ENV === 'dev';
