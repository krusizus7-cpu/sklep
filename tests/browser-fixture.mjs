import { loadShop } from '../server/config.mjs';
import { createP24 } from '../server/p24.mjs';
import { createShopServer } from '../server.mjs';

const port = 8123;
const config = {
  mode: 'sandbox', merchantId: 123, posId: 124, crc: 'fixture-crc', apiKey: 'fixture-key',
  origin: 'http://127.0.0.1:' + port
};
const transport = async url => Response.json({
  data: url.endsWith('/register') ? {token: 'browser-fixture'} : {status: 'success'},
  responseCode: 0
});
const server = createShopServer({
  shop: loadShop('shop.example.json'),
  dbPath: process.argv[2],
  p24: createP24(config, transport)
});
server.listen(port, '127.0.0.1', () => console.log('ready'));
