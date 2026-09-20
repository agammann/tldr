// Only authenticated HTTP on the literal loopback address is supported.
export function validatePairing(value) {
  if (!value || typeof value.endpoint !== 'string' || typeof value.token !== 'string') throw new Error('This is not a valid pairing file.');
  const match = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value.endpoint);
  if (!match || Number(match[1]) > 65535 || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error('This is not a valid pairing file.');
  return { endpoint: value.endpoint, token: value.token };
}
