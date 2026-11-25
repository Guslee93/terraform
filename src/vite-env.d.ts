/// <reference types="vite/client" />

/** package.json version, injected by Vite (`define`). */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** TF-VIS-015 (ADR-0040): enables the local-only Visual Lab route in a non-dev build. */
  readonly VITE_LAB?: string
  /** Owner's MapTiler key for the Lab's sharp satellite ground (ADR-0041 §3); lives in .env.local, never committed. */
  readonly VITE_MAPTILER_KEY?: string
}
