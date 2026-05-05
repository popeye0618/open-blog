/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

import type { OwnerSession } from './lib/auth';

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: Env;
      };
      session?: OwnerSession;
    }
  }
}

interface Env {
  DB: D1Database;
  PUBLIC_SITE_URL?: string;
  AUTH_MODE?: 'cf_access' | 'password';
  OWNER_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  JWT_SECRET?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  IP_HASH_SALT?: string;
}

declare module '*.wasm?url' {
  const src: string;
  export default src;
}

declare module '*.woff2?url' {
  const src: string;
  export default src;
}

declare module '*.woff?url' {
  const src: string;
  export default src;
}

export {};
