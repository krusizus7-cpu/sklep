import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntime } from './server/config.mjs';
import { createCommerce } from './server/commerce.mjs';
import { createP24 } from './server/p24.mjs';
import { HttpError, orderIdPattern } from './server/orders.mjs';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const legacyRoot = fileURLToPath(new URL('./legacy/', import.meta.url));
const files = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'], ['/app.js', 'app.js'],
  ['/styles.css', 'styles.css'], ['/polish.css', 'polish.css'],
  ['/fonts.css', 'fonts.css'], ['/hero-finder.css', 'hero-finder.css'], ['/storefront.css', 'storefront.css']
]);
const types = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  woff2: 'font/woff2', txt: 'text/plain; charset=utf-8', svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'
};


function json(res, status, value) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Oczekiwano danych w formacie JSON.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({destroyOnReturn: false})) {
    size += chunk.length;
    if (size > 16000) {
      req.resume();
      throw new HttpError(413, 'Formularz jest za duży.');
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Nie można odczytać formularza.');
  }
}

export function createShopServer({shop, dbPath, p24}) {
  const commerce = createCommerce({shop, dbPath, p24});

  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (p24?.mode === 'live') res.setHeader('Strict-Transport-Security', 'max-age=31536000');

    const path = new URL(req.url, 'http://store.invalid').pathname;
    if (req.method === 'GET' && path === '/api/shop') return json(res, 200, commerce.catalog());
    if (req.method === 'POST' && path === '/api/orders') {
      return json(res, 201, await commerce.submit(await readJson(req)));
    }
    if (req.method === 'POST' && path === '/api/payments/p24/notify') {
      await commerce.notify(await readJson(req));
      res.writeHead(200, {'Cache-Control': 'no-store'}).end();
      return;
    }
    const id = path.split('/').at(-1);
    if (req.method === 'GET' && orderIdPattern.test(id)) {
      if (path === '/api/orders/' + id) {
        return json(res, 200, commerce.status(id));
      }
      if (path === '/payment-return/' + id) {
        res.writeHead(303, {Location: '/#/order/' + id, 'Cache-Control': 'no-store'}).end();
        return;
      }
    }

    const asset = /^\/assets\/[\w-]+\.(?:svg|webp|png|jpe?g)$/i.test(path);
    const font = /^\/fonts\/[\w-]+\.(?:woff2|txt)$/.test(path);
    const file = files.get(path) ?? (asset || font ? path.slice(1) : null);
    if (!file || !['GET', 'HEAD'].includes(req.method)) throw new HttpError(404, 'Nie znaleziono strony.');
    const filename = resolve(['index.html', 'app.js'].includes(file) ? legacyRoot : publicRoot, file);
    let contents;
    try {
      contents = req.method === 'HEAD' ? await stat(filename) : await readFile(filename);
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'Nie znaleziono pliku.');
      throw error;
    }
    res.writeHead(200, {
      'Content-Type': types[file.split('.').at(-1).toLowerCase()],
      'Content-Length': req.method === 'HEAD' ? contents.size : contents.length
    }).end(req.method === 'HEAD' ? undefined : contents);
  }

  const server = createServer({requestTimeout: 20000, headersTimeout: 10000}, (req, res) => {
    handle(req, res).catch(error => {
      if (error instanceof HttpError) return json(res, error.status, {error: error.message});
      console.error('Store request failed:', error.name, error.code ?? '');
      return json(res, 500, {error: 'Wystąpił błąd. Spróbuj ponownie.'});
    });
  });
  server.on('close', () => commerce.close());
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.umask(0o077);
  const {shop, dbPath, payment} = loadRuntime();
  const server = createShopServer({shop, dbPath, p24: payment && createP24(payment)});
  server.listen(Number(process.env.PORT || 8000), process.env.BIND_HOST || '0.0.0.0', () => {
    console.log('BIEŻNIK listening on port ' + server.address().port + ' (' + (payment?.mode ?? 'preview') + ')');
  });
}
