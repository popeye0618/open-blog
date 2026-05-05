const ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

const plain = process.argv[2];

if (!plain) {
  console.error('Usage: npm exec --yes tsx -- scripts/hash-password.ts <plain-password>');
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(plain),
  'PBKDF2',
  false,
  ['deriveBits'],
);
const bits = await crypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    salt,
    iterations: ITERATIONS,
    hash: 'SHA-256',
  },
  key,
  HASH_BYTES * 8,
);

console.log(`pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`);

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
