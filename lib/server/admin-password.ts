const encoder = new TextEncoder();

function decodeSalt(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}

function encodeHash(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Cloudflare Workers caps each PBKDF2 invocation at 100,000 iterations.
// Three domain-separated stages keep the password derivation expensive while
// remaining within that runtime limit.
export async function adminPasswordHash(password: string, salt: string) {
  const saltBytes = decodeSalt(salt);
  let material = encoder.encode(password);
  for (let stage = 0; stage < 3; stage++) {
    const stageSalt = new Uint8Array(saltBytes.length + 1);
    stageSalt.set(saltBytes);
    stageSalt[saltBytes.length] = stage;
    const key = await crypto.subtle.importKey('raw', material as BufferSource, 'PBKDF2', false, ['deriveBits']);
    material = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: stageSalt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
      key, 256,
    ));
  }
  return `v2:${encodeHash(material)}`;
}
