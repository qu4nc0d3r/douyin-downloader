export function extractError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}
