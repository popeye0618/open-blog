export function getSiteUrl(env: Env, request: Request): string {
  const fromEnv = env.PUBLIC_SITE_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  return new URL(request.url).origin;
}
