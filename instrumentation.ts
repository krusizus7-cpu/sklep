export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') process.umask(0o077);
}
