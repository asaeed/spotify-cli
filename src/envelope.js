export const EXIT = {
  OK: 0,
  GENERIC: 1,
  NOT_AUTH: 2,
  BAD_INPUT: 3,
  NETWORK: 4,
  RATE_LIMIT: 5,
};

export function ok(data) {
  process.stdout.write(JSON.stringify({ status: 'ok', data, error: null }) + '\n');
  process.exit(EXIT.OK);
}

export function fail(code, message, hint) {
  process.stdout.write(
    JSON.stringify({
      status: 'error',
      data: null,
      error: { code, message, ...(hint ? { hint } : {}) },
    }) + '\n'
  );
  const exit =
    code === 'not_authenticated' ? EXIT.NOT_AUTH :
    code === 'bad_input' ? EXIT.BAD_INPUT :
    code === 'rate_limited' ? EXIT.RATE_LIMIT :
    code === 'network_error' ? EXIT.NETWORK :
    EXIT.GENERIC;
  process.exit(exit);
}
