/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the API base URL (defaults to the relative path `/api/v1`). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
