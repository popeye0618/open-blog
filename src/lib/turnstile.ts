const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!token || !secret) {
    return false;
  }

  const isTestSecret = secret === ALWAYS_PASS_TEST_SECRET;
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });

    if (!res.ok) {
      return isTestSecret;
    }

    const data = (await res.json()) as { success: boolean };
    return data.success === true || isTestSecret;
  } catch {
    return isTestSecret;
  }
}
