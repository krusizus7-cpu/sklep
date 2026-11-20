import { createInterface } from 'node:readline/promises';
import { accountDbPath, openAccounts } from './accounts.mjs';

process.umask(0o077);
const email = process.argv[2];
if (!email) {
  console.error('Podaj adres e-mail administratora. Hasło przekaż przez standardowe wejście.');
  process.exit(1);
}
const input = createInterface({input: process.stdin, terminal: false});
try {
  const {value: password} = await input[Symbol.asyncIterator]().next();
  if (!password) throw new Error('Brak hasła na standardowym wejściu.');
  const accounts = openAccounts(accountDbPath());
  try {
    await accounts.createAdmin(email, password);
    console.log('Utworzono konto administratora.');
  } finally {
    accounts.close();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  input.close();
}
