export const EXIT = {
  OK: 0,
  GENERIC: 1,
  NOT_AUTH: 2,
  BAD_INPUT: 3,
  NETWORK: 4,
  RATE_LIMIT: 5,
};

function emit(envelope, code) {
  // Large JSON responses must finish draining a pipe before process exit.
  process.stdout.write(JSON.stringify(envelope) + '\n', () => process.exit(code));
}

export function ok(data) {
  emit({ status: 'ok', data, error: null }, EXIT.OK);
}

export function fail(code, message, hint) {
  const exit =
    code === 'not_authenticated' ? EXIT.NOT_AUTH :
    code === 'bad_input' ? EXIT.BAD_INPUT :
    code === 'rate_limited' ? EXIT.RATE_LIMIT :
    code === 'network_error' ? EXIT.NETWORK :
    EXIT.GENERIC;
  emit({status: 'error', data: null, error: {code, message, ...(hint ? {hint} : {})}}, exit);
}
