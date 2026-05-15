/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN: string;
  readonly VITE_API_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
