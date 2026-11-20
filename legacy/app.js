'use strict';

// The example catalogue is used only when ordering is disabled.

const PREVIEW_PRODUCTS = Object.freeze([
  { id: 't1', type: 'tires', brand: 'VECTOR', name: 'Performance S1', size: '225/50 R17', diameter: 17, width: 225, profile: 50, season: 'summer', seasonLabel: 'LETNIA', price: 459, oldPrice: 519, image: 'assets/tire-sport.svg', badge: 'WYBRANE', badgeRed: true, description: 'Sportowy charakter i stabilne prowadzenie. Przykładowy produkt dla miłośników dynamicznej jazdy.' },
  { id: 'w1', type: 'wheels', brand: 'AXIOM', name: 'R/10 Graphite', size: '8J × 18 · 5×112 · ET45', diameter: 18, pcd: '5x112', et: '45', finish: 'Graphite', price: 899, oldPrice: 0, image: 'assets/wheel-satin.svg', badge: 'NEW DROP', badgeRed: true, description: 'Wieloramienny rysunek, ciemne wykończenie i detal inspirowany motorsportem. Projekt poglądowy.' },
  { id: 't2', type: 'tires', brand: 'NORTHLINE', name: 'Winter W3', size: '205/55 R16', diameter: 16, width: 205, profile: 55, season: 'winter', seasonLabel: 'ZIMOWA', price: 369, oldPrice: 0, image: 'assets/tire-winter.svg', badge: 'ZIMA', badgeRed: false, description: 'Wizualizacja opony zimowej przeznaczonej do zmiennych warunków pogodowych.' },
  { id: 'w2', type: 'wheels', brand: 'MONO', name: 'RS/05 Silver', size: '8J × 18 · 5×112 · ET40', diameter: 18, pcd: '5x112', et: '40', finish: 'Silver', price: 759, oldPrice: 829, image: 'assets/wheel-silver.svg', badge: 'POPULARNE', badgeRed: false, description: 'Pięcioramienna forma i satynowane wykończenie w ponadczasowym stylu.' },
  { id: 't3', type: 'tires', brand: 'ROADWORK', name: 'Allway A4', size: '225/50 R17', diameter: 17, width: 225, profile: 50, season: 'allseason', seasonLabel: 'CAŁOROCZNA', price: 429, oldPrice: 0, image: 'assets/tire-all.svg', badge: 'ALL SEASON', badgeRed: false, description: 'Koncepcyjna opona całoroczna do codziennej jazdy miejskiej i tras.' },
  { id: 'w3', type: 'wheels', brand: 'FORGED', name: 'M/12 Bronze', size: '8.5J × 19 · 5×120 · ET35', diameter: 19, pcd: '5x120', et: '35', finish: 'Satin Bronze', price: 1099, oldPrice: 0, image: 'assets/wheel-bronze.svg', badge: 'LIMITED', badgeRed: true, description: 'Gęsty układ ramion, wyrazista struktura i satynowy brąz. Przykładowa linia premium.' },
  { id: 't4', type: 'tires', brand: 'VECTOR', name: 'Touring T2', size: '245/45 R18', diameter: 18, width: 245, profile: 45, season: 'summer', seasonLabel: 'LETNIA', price: 539, oldPrice: 0, image: 'assets/tire-tour.svg', badge: 'TOURING', badgeRed: false, description: 'Komfort codziennej jazdy i charakter długodystansowy. Materiał demonstracyjny.' },
  { id: 'w4', type: 'wheels', brand: 'AXIOM', name: 'V/05 Titanium', size: '7.5J × 17 · 5×112 · ET45', diameter: 17, pcd: '5x112', et: '45', finish: 'Titanium', price: 679, oldPrice: 0, image: 'assets/wheel-black.svg', badge: 'CLASSIC', badgeRed: false, description: 'Prosta sportowa geometria z charakterystycznym metalicznym wykończeniem.' }
]);

let products = [];
let shop = null;
let orderPoll;
let orderCheck = 0;
let submitting = false;

const state = {
  cart: new Map(),
  favorites: new Set(),
  finderType: 'tires',
  featuredType: 'all',
  catalog: { category: 'all', diameter: 'all', season: 'all', query: '', pcd: '', width: '', profile: '', et: '' },
  detailQuantity: 1,
  activeProduct: null,
  lastFocus: null,
  toastTimeout: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = amount => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(amount);
const sanitize = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const findProduct = id => products.find(product => product.id === id);
const isTire = product => product.type === 'tires';
const itemCount = () => [...state.cart.values()].reduce((sum, qty) => sum + qty, 0);

const subtotal = () => [...state.cart].reduce((sum, [id, qty]) => sum + findProduct(id).priceCents * qty, 0);
const shipping = () => shop && itemCount() ? shop.shipping.firstCents + shop.shipping.additionalCents * (itemCount() - 1) : 0;
const cartTotal = () => subtotal() / 100;
const maxQuantity = id => Math.min(findProduct(id)?.stock ?? 0, shop?.maxPerProduct ?? 20);
const maxUnits = () => shop?.maxUnits ?? 40;
const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stored(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    return null;
  }
}

function saveCart() {
  stored('bieznik.cart', JSON.stringify([...state.cart]));
  stored('bieznik.checkout', null);
}

const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11a5 5 0 0 1 8.8-3.1 5 5 0 0 1 8.8 3.1Z"/></svg>';

function productCard(product) {
  const saved = state.favorites.has(product.id);
  return `<article class="product-card" data-product="${product.id}">
    <div class="product-media">
      <img src="${sanitize(product.image)}" alt="${sanitize(product.brand)} ${sanitize(product.name)}" loading="lazy" decoding="async" width="700" height="700">
      <button type="button" class="wish-btn ${saved ? 'saved' : ''}" data-favorite="${product.id}" aria-label="${saved ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}: ${sanitize(product.name)}" aria-pressed="${saved}">${heartSvg}</button>
    </div>
    <div class="product-body">
      <p class="product-brand">${sanitize(product.brand)}</p>
      <h3 class="product-title"><a href="#/product/${product.id}">${sanitize(product.name)}</a></h3>
      <p class="product-spec">${sanitize(product.size)}${isTire(product) ? ' · ' + sanitize(product.seasonLabel) : ''}</p>
      <div class="product-price-row">
        <div class="price"><strong>${money(product.price)}</strong><small>za sztukę</small></div>
        ${product.stock ? `<button type="button" class="product-add" data-add="${product.id}" aria-label="Dodaj do koszyka: ${sanitize(product.name)}">+</button>` : '<span class="stock-label">Niedostępny</span>'}
      </div>
    </div>
  </article>`;
}

function showToast(message) {
  const toast = $('#toast');
  clearTimeout(state.toastTimeout);
  toast.textContent = message;
  toast.hidden = false;
  state.toastTimeout = setTimeout(() => { toast.hidden = true; }, 3300);
}

function renderFeatured() {
  const featured = products.filter(product => state.featuredType === 'all' || product.type === state.featuredType).slice(0, 4);
  $('#featuredGrid').innerHTML = featured.map(productCard).join('');
  $$('[data-featured]').forEach(button => {
    button.classList.toggle('active', button.dataset.featured === state.featuredType);
    button.setAttribute('aria-selected', String(button.dataset.featured === state.featuredType));
  });
}

function updateCounters() {
  $('#headerCartCount').textContent = itemCount();
  const favorites = $('.favorites-count');
  favorites.textContent = state.favorites.size;
  favorites.hidden = state.favorites.size === 0;
}

function addToCart(id, quantity = 1) {
  const previous = state.cart.get(id) || 0;
  if (setCartQuantity(id, previous + quantity)) showToast(`Dodano do koszyka · ${findProduct(id).name}`);
}

function setCartQuantity(id, quantity) {
  if (!findProduct(id) || submitting) return false;
  const previous = state.cart.get(id) || 0;
  if (quantity > maxQuantity(id) || itemCount() - previous + quantity > maxUnits()) {
    showToast('Osiągnięto limit dostępnych sztuk w koszyku.');
    return false;
  }
  if (quantity <= 0) state.cart.delete(id);
  else state.cart.set(id, quantity);
  saveCart();
  updateCounters();
  renderDrawer();
  if (currentPage() === 'cart') renderCartPage();
  if (currentPage() === 'checkout') renderCheckout();
  return true;
}

function toggleFavorite(id) {
  if (!findProduct(id)) return;
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  updateCounters();
  renderFeatured();
  if (currentPage() === 'catalog') renderCatalog();
  if (currentPage() === 'product') renderProduct(state.activeProduct);
  if (currentPage() === 'favorites') renderFavorites();
  showToast(state.favorites.has(id) ? 'Zapisano na liście ulubionych.' : 'Usunięto z ulubionych.');
}

function showFinderType(type) {
  state.finderType = type;
  $$('[data-finder-tab]').forEach(button => {
    const selected = button.dataset.finderTab === type;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  $$('.finder-tire-fields').forEach(field => { field.hidden = type !== 'tires'; });
  $$('.finder-wheel-fields').forEach(field => { field.hidden = type !== 'wheels'; });
  $('#finderExtraLabel').textContent = type === 'tires' ? 'Sezon' : 'Wykończenie';
  const tireSeasons = [['summer', 'Letnie'], ['winter', 'Zimowe'], ['allseason', 'Całoroczne']];
  const wheelFinishes = [...new Set(products.filter(p => p.type === 'wheels').map(p => p.finish))];
  setOptions($('#finderExtra'), type === 'tires' ? 'Każdy sezon' : 'Każde wykończenie',
    type === 'tires' ? tireSeasons : wheelFinishes.map(finish => [finish, finish]), 'all');
  $('#finderExample').textContent = type === 'tires' ? 'Np. 225 / 50 R17' : 'Np. 18″ / 5×112 / ET40';
}

function setOptions(select, label, values, emptyValue = '') {
  select.replaceChildren(new Option(label, emptyValue), ...values.map(([value, name]) => new Option(name, value)));
}

function configureFinder() {
  const options = [
    ['tireWidth', 'tires', 'width'], ['tireProfile', 'tires', 'profile'], ['tireDiameter', 'tires', 'diameter'],
    ['wheelDiameter', 'wheels', 'diameter'], ['wheelPcd', 'wheels', 'pcd'], ['wheelEt', 'wheels', 'et']
  ];
  for (const [id, type, field] of options) {
    const select = document.getElementById(id);
    const values = [...new Set(products.filter(p => p.type === type).map(p => p[field]))];
    values.sort((a, b) => String(a).localeCompare(String(b), 'pl', {numeric:true}));
    setOptions(select, 'Dowolny', values.map(value => [value, value]));
  }
  const diameters = [...new Set(products.map(p => p.diameter))].sort((a, b) => a - b);
  $('#filterDiameter').replaceChildren(...[['all', 'Wszystkie'], ...diameters.map(n => [n, n + '″'])].map(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.diameter = value;
    button.textContent = label;
    return button;
  }));
}

function handleFinder(event) {
  event.preventDefault();
  const type = state.finderType;
  state.catalog = {
    category: type,
    diameter: type === 'tires' ? ($('#tireDiameter').value || 'all') : ($('#wheelDiameter').value || 'all'),
    season: type === 'tires' ? $('#finderExtra').value : 'all',
    query: '',
    pcd: type === 'wheels' ? $('#wheelPcd').value : '',
    width: type === 'tires' ? $('#tireWidth').value : '',
    profile: type === 'tires' ? $('#tireProfile').value : '',
    et: type === 'wheels' ? $('#wheelEt').value : '',
    finish: type === 'wheels' && $('#finderExtra').value !== 'all' ? $('#finderExtra').value : ''
  };
  location.hash = `#/catalog/${type}`;
  if (currentPage() === 'catalog' && location.hash === `#/catalog/${type}`) renderCatalog();
}

function filteredProducts() {
  const f = state.catalog;
  return products.filter(p => {
    if (f.category !== 'all' && p.type !== f.category) return false;
    if (f.diameter !== 'all' && String(p.diameter) !== String(f.diameter)) return false;
    if (f.season !== 'all' && p.type === 'tires' && p.season !== f.season) return false;
    if (f.season !== 'all' && p.type === 'wheels') return false;
    if (f.width && p.type === 'tires' && String(p.width) !== f.width) return false;
    if (f.profile && p.type === 'tires' && String(p.profile) !== f.profile) return false;
    if (f.pcd && p.type === 'wheels' && p.pcd !== f.pcd) return false;
    if (f.et && p.type === 'wheels' && p.et !== f.et) return false;
    if (f.finish && p.type === 'wheels' && p.finish !== f.finish) return false;
    if (f.query) {
      const search = `${p.brand} ${p.name} ${p.size} ${p.seasonLabel || ''} ${p.type === 'wheels' ? 'felgi' : 'opony'} ${p.type === 'wheels' ? p.finish : ''}`.toLocaleLowerCase('pl');
      if (!search.includes(f.query.toLocaleLowerCase('pl'))) return false;
    }
    return true;
  }).sort((a, b) => {
    const sort = $('#catalogSort').value;
    return sort === 'priceAsc' ? a.price - b.price : sort === 'priceDesc' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name, 'pl') : 0;
  });
}

function renderCatalog() {
  const type = state.catalog.category;
  const labels = { all: ['CAŁA OFERTA', 'Opony i felgi w jednym miejscu. Wybierz właściwe parametry i znajdź swój zestaw.'], tires: ['OPONY', 'Znajdź rozmiar i sezon, który odpowiada Twoim potrzebom.'], wheels: ['FELGI', 'Zmień wygląd auta i dobierz parametry montażowe.'] };
  $('#catalogHeading').innerHTML = `${labels[type][0]}<span>.</span>`;
  $('#catalogBreadcrumb').textContent = labels[type][0].toLocaleLowerCase('pl');
  $('#catalogIntro').textContent = labels[type][1];
  const list = filteredProducts();
  $('#catalogResult').textContent = `Wyniki: ${list.length}${state.catalog.query ? ` · „${state.catalog.query}”` : ''}`;
  $('#catalogGrid').innerHTML = list.map(productCard).join('');
  $('#catalogEmpty').hidden = list.length !== 0;
  $$('[name="categoryFilter"]').forEach(input => { input.checked = input.value === type; });
  $$('[name="seasonFilter"]').forEach(input => { input.checked = input.value === state.catalog.season; });
  $$('[data-diameter]').forEach(button => button.classList.toggle('active', button.dataset.diameter === state.catalog.diameter));
}

function resetFilters(keepCategory = true) {
  const category = keepCategory ? state.catalog.category : 'all';
  state.catalog = { category, diameter: 'all', season: 'all', query: '', pcd: '', width: '', profile: '', et: '', finish: '' };
  renderCatalog();
}

function renderProduct(id) {
  const p = findProduct(id);
  if (!p) { location.hash = '#/catalog/all'; return; }
  state.activeProduct = id;
  state.detailQuantity = 1;
  $('#productBreadcrumb').innerHTML = `<a href="#/" data-link>Start</a><span>/</span><a href="#/catalog/${p.type}" data-link>${isTire(p) ? 'Opony' : 'Felgi'}</a><span>/</span><span>${sanitize(p.name)}</span>`;
  const tire = isTire(p);
  const stock = p.stock ? (shop ? 'Dostępne sztuki: ' + p.stock : 'Produkt przykładowy') : 'Produkt niedostępny';
  const tireLabel = p.eprelUrl && p.labelImage ? `<a class="eprel-label" href="${sanitize(p.eprelUrl)}" target="_blank" rel="noopener noreferrer"><img src="${sanitize(p.labelImage)}" alt="Etykieta UE opony">Karta informacyjna w EPREL</a>` : '';
  $('#productDetail').innerHTML = `<div class="product-detail-layout">
    <div class="detail-gallery"><img src="${sanitize(p.image)}" alt="${sanitize(p.name)}" width="700" height="700"></div>
    <div class="detail-info">
      <p class="eyebrow">${sanitize(p.brand)}</p><h1>${sanitize(p.name)}</h1><p class="detail-lead">${sanitize(p.description)}</p>
      <div class="detail-specs">
        <div><span>Rozmiar</span><strong>${sanitize(p.size)}</strong></div>
        <div><span>${tire ? 'Sezon' : 'Wykończenie'}</span><strong>${sanitize(tire ? p.seasonLabel : p.finish)}</strong></div>
      </div>${tireLabel}
      <div class="detail-price-line"><div><strong>${money(p.price)}</strong><small> / szt.</small></div><small>${stock}</small></div>
      ${p.stock ? `<div class="quantity-wrap"><div class="quantity-stepper"><button aria-label="Zmniejsz ilość" type="button" data-detail-qty="-1">−</button><span id="detailQty">1</span><button aria-label="Zwiększ ilość" type="button" data-detail-qty="1">+</button></div><button type="button" class="btn btn-red" data-detail-add="${p.id}">Dodaj do koszyka</button></div>` : ''}
      <button class="btn btn-border" type="button" data-favorite="${p.id}">${state.favorites.has(p.id) ? '♥ W ulubionych' : '♡ Dodaj do ulubionych'}</button>
      <a class="detail-back" href="#/guide" data-link>Jak sprawdzić zgodność z samochodem?</a>
    </div>
  </div>`;
  const related = products.filter(item => item.type === p.type && item.id !== p.id).slice(0, 3);
  $('#relatedGrid').innerHTML = related.map(productCard).join('');
}

function cartLinesHtml() {
  return [...state.cart.entries()].map(([id, qty]) => {
    const p = findProduct(id);
    return `<div class="cart-line"><a href="#/product/${id}" class="cart-thumb" data-link><img src="${sanitize(p.image)}" alt="${sanitize(p.name)}"></a><div class="cart-item-main"><h3>${sanitize(p.brand)} ${sanitize(p.name)}</h3><p>${sanitize(p.size)} · ${money(p.price)} / szt.</p><button type="button" data-remove="${id}">Usuń z koszyka</button></div><div class="cart-line-right"><strong>${money(p.price * qty)}</strong><div class="mini-step"><button type="button" data-cart-qty="${id}" data-delta="-1" aria-label="Zmniejsz ilość ${sanitize(p.name)}">−</button><span>${qty}</span><button type="button" data-cart-qty="${id}" data-delta="1" aria-label="Zwiększ ilość ${sanitize(p.name)}">+</button></div></div></div>`;
  }).join('');
}

function renderCartPage() {
  const slot = $('#cartFull');
  if (!state.cart.size) {
    slot.innerHTML = `<div class="empty-cart"><h2>Twój koszyk jest pusty</h2><p>Wybierz opony lub felgi z katalogu.</p><a href="#/catalog/all" class="btn btn-red" data-link>ZOBACZ OFERTĘ <span class="btn-arrow">↗</span></a></div>`;
    return;
  }
  slot.innerHTML = `<div class="cart-layout"><div class="cart-lines">${cartLinesHtml()}</div><aside class="cart-summary"><h2>Podsumowanie</h2><div class="summary-total"><span>${itemCount()} szt. w koszyku</span><strong>${money(cartTotal())}</strong></div>${shop ? `<p>Dostawa kurierem: ${money(shipping() / 100)}</p><a href="#/checkout" class="btn btn-red btn-wide" data-link>Przejdź do zamówienia</a>` : '<p>Sprzedaż jest obecnie niedostępna.</p>'}</aside></div>`;
}

function renderDrawer() {
  const slot = $('#drawerItems');
  $('#drawerTotal').textContent = money(cartTotal());
  if (!state.cart.size) {
    slot.innerHTML = `<div class="empty-cart"><h2>KOSZYK JEST PUSTY.</h2><p>Dodaj produkt, by rozpocząć.</p><a href="#/catalog/all" class="btn btn-red" data-link>PRZEJRZYJ OFERTĘ <span class="btn-arrow">↗</span></a></div>`;
    return;
  }
  slot.innerHTML = [...state.cart.entries()].map(([id, qty]) => {
    const p = findProduct(id);
    return `<div class="drawer-line"><img src="${sanitize(p.image)}" alt="${sanitize(p.name)}"><div><h3>${sanitize(p.brand)} ${sanitize(p.name)}</h3><p>${sanitize(p.size)} · ${qty} szt.</p><b>${money(p.price * qty)}</b><button type="button" data-remove="${id}">Usuń</button></div></div>`;
  }).join('');
}

function renderCheckout() {
  $('#checkoutUnavailable').hidden = Boolean(shop);
  $('#checkoutLayout').hidden = !shop;
  if (!shop) return;
  const slot = $('#checkoutItems');
  slot.innerHTML = [...state.cart.entries()].map(([id, qty]) => {
    const p = findProduct(id);
    return `<div class="checkout-summary-item"><span>${sanitize(p.brand)} ${sanitize(p.name)} × ${qty}</span><strong>${money(p.price * qty)}</strong></div>`;
  }).join('') || '<p>Koszyk jest pusty. Wróć do katalogu.</p>';
  $('#checkoutShipping').textContent = money(shipping() / 100);
  $('#checkoutTotal').textContent = money((subtotal() + shipping()) / 100);
  $('#checkoutForm').querySelector('button[type="submit"]').disabled = state.cart.size === 0 || submitting;
}

function renderFavorites() {
  const selected = products.filter(product => state.favorites.has(product.id));
  $('#favoritesGrid').innerHTML = selected.map(productCard).join('');
  $('#favoritesEmpty').hidden = selected.length !== 0;
}

function currentPage() {
  return $('.page:not([hidden])')?.dataset.page || 'home';
}

function setRoute() {
  closeLayers();
  clearTimeout(orderPoll);
  orderCheck++;
  const parts = (location.hash || '#/').slice(2).split('/');
  const route = parts[0] || 'home';
  const pageName = ({ catalog: 'catalog', product: 'product', cart: 'cart', checkout: 'checkout', order: 'order', guide: 'guide', favorites: 'favorites' })[route] || 'home';
  $$('.page').forEach(page => { page.hidden = page.dataset.page !== pageName; });
  $$('.desktop-nav a').forEach(link => link.classList.toggle('active', link.getAttribute('href') === location.hash));
  if (pageName === 'catalog') {
    const type = ['tires', 'wheels', 'all'].includes(parts[1]) ? parts[1] : 'all';
    if (state.catalog.category !== type) state.catalog = { category: type, diameter: 'all', season: 'all', query: '', pcd: '', width: '', profile: '', et: '', finish: '' };
    renderCatalog();
  }
  if (pageName === 'product') renderProduct(parts[1]);
  if (pageName === 'cart') renderCartPage();
  if (pageName === 'checkout') renderCheckout();
  if (pageName === 'favorites') renderFavorites();
  if (pageName === 'order') showOrder(parts[1]);
  const names = { home: 'Start', catalog: 'Sklep', product: 'Produkt', cart: 'Koszyk', checkout: 'Zamówienie', order: 'Status zamówienia', guide: 'Poradnik', favorites: 'Ulubione' };
  document.title = `BIEŻNIK — ${names[pageName]}`;
  // Preserve real in-page navigation for hero CTAs. `#finder` and
  // `#categories` are section anchors rather than application routes.
  const section = ['finder', 'categories', 'featured'].find(id => location.hash === `#${id}`);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (section) {
    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    }));
  }
}

function activateOverlay(target) {
  state.lastFocus = document.activeElement;
  $('#overlay').hidden = false;
  target.hidden = false;
  document.body.classList.add('body-locked');
  if (target.id === 'searchModal') $('#searchInput').focus();
  else $('#cartClose').focus();
}

function closeLayers() {
  const wasOpen = !$('#searchModal').hidden || !$('#cartDrawer').hidden;
  $('#searchModal').hidden = true;
  $('#cartDrawer').hidden = true;
  $('#overlay').hidden = true;
  document.body.classList.remove('body-locked');
  $('#mobileMenu').hidden = true;
  $('#menuToggle').setAttribute('aria-expanded', 'false');
  if (wasOpen && state.lastFocus?.isConnected) state.lastFocus.focus();
}

async function api(path, options) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Wystąpił błąd. Spróbuj ponownie.');
  return result;
}

function rememberOrder(id) {
  stored('bieznik.order', id);
  const link = $('#lastOrderLink');
  link.href = '#/order/' + id;
  link.hidden = false;
}

async function handleCheckout(event) {
  event.preventDefault();
  if (!shop || !state.cart.size || submitting) return;
  const form = event.currentTarget;
  const errorMessage = $('#checkoutError');
  errorMessage.hidden = true;
  const customer = Object.fromEntries(new FormData(form));
  customer.termsAccepted = customer.termsAccepted === 'on';
  const requestId = stored('bieznik.checkout') || crypto.randomUUID();
  stored('bieznik.checkout', requestId);
  submitting = true;
  form.querySelector('button[type="submit"]').textContent = 'Łączenie z Przelewy24…';
  renderCheckout();
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        requestId, customer, expectedTotal: subtotal() + shipping(),
        expectedTermsUrl: shop.merchant.termsUrl,
        items: [...state.cart].map(([id, quantity]) => ({id, quantity}))
      })
    });
    rememberOrder(order.id);
    state.cart.clear();
    saveCart();
    updateCounters();
    renderDrawer();
    form.reset();
    location.hash = '#/order/' + order.id;
    if (order.paymentUrl) location.assign(order.paymentUrl);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  } finally {
    submitting = false;
    form.querySelector('button[type="submit"]').textContent = 'Zamawiam i płacę';
    renderCheckout();
  }
}

async function showOrder(id, attempts = 0) {
  clearTimeout(orderPoll);
  const check = ++orderCheck;
  const message = $('#orderMessage');
  const resume = $('#resumePayment');
  if (attempts === 0) {
    resume.hidden = true;
    $('#orderNumber').textContent = orderIdPattern.test(id ?? '') ? id : '—';
    message.textContent = 'Sprawdzamy płatność…';
  }
  if (!orderIdPattern.test(id ?? '')) {
    message.textContent = 'Nie znaleziono zamówienia.';
    return;
  }
  try {
    const order = await api('/api/orders/' + id);
    if (check !== orderCheck) return;
    const statuses = {
      registering: 'Rejestrujemy płatność.',
      pending: order.paymentUrl ? 'Czekamy na potwierdzenie płatności.' : 'Link do płatności wygasł. Jeśli płatność została wykonana, sprawdź status ponownie lub skontaktuj się ze sklepem.',
      paid: 'Płatność potwierdzona. Dziękujemy za zamówienie.',
      shipped: 'Zamówienie wysłane. Numer przesyłki: ' + order.trackingNumber,
      cancelled: 'Zamówienie zostało anulowane.'
    };
    const status = statuses[order.status];
    if (status !== message.textContent) message.textContent = status;
    resume.hidden = !order.paymentUrl;
    if (order.paymentUrl) resume.href = order.paymentUrl;
    if (['registering', 'pending'].includes(order.status) && attempts < 14) {
      orderPoll = setTimeout(() => showOrder(id, attempts + 1), 3000);
    }
  } catch {
    if (check === orderCheck) message.textContent = 'Nie udało się pobrać statusu. Spróbuj ponownie.';
  }
}

// Event delegation handles cards that are re-rendered by filters and routing.
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  const anchor = event.target.closest('a');
  // Landing-page anchors must scroll, not go through the SPA hash router.
  if (anchor && ['#finder', '#categories', '#featured'].includes(anchor.getAttribute('href'))) {
    event.preventDefault();
    const id = anchor.getAttribute('href').slice(1);
    document.getElementById(id)?.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
    return;
  }
  if (button?.dataset.add) { event.preventDefault(); addToCart(button.dataset.add); return; }
  if (button?.dataset.favorite) { event.preventDefault(); toggleFavorite(button.dataset.favorite); return; }
  if (button?.dataset.remove) { event.preventDefault(); setCartQuantity(button.dataset.remove, 0); return; }
  if (button?.dataset.cartQty) { event.preventDefault(); const id = button.dataset.cartQty; setCartQuantity(id, (state.cart.get(id) || 0) + Number(button.dataset.delta)); return; }
  if (button?.dataset.detailQty) { event.preventDefault(); state.detailQuantity = Math.max(1, Math.min(maxQuantity(state.activeProduct), state.detailQuantity + Number(button.dataset.detailQty))); $('#detailQty').textContent = state.detailQuantity; return; }
  if (button?.dataset.detailAdd) { event.preventDefault(); addToCart(button.dataset.detailAdd, state.detailQuantity); return; }
  if (button?.dataset.featured) { state.featuredType = button.dataset.featured; renderFeatured(); return; }
  if (button?.dataset.finderTab) { showFinderType(button.dataset.finderTab); return; }
  if (button?.dataset.diameter) { state.catalog.diameter = button.dataset.diameter; renderCatalog(); return; }
  if (button?.dataset.quickSearch) { $('#searchInput').value = button.dataset.quickSearch; $('#searchForm').requestSubmit(); return; }
  if (anchor?.hasAttribute('data-link')) closeLayers();
});

$('#finderForm').addEventListener('submit', handleFinder);
$('#findSizeHelp').addEventListener('click', () => { location.hash = '#/guide'; });
$('#catalogSort').addEventListener('change', renderCatalog);
$('#filterCategory').addEventListener('change', event => { state.catalog.category = event.target.value; state.catalog.season = 'all'; state.catalog.diameter = 'all'; state.catalog.pcd = ''; state.catalog.et = ''; state.catalog.width = ''; state.catalog.profile = ''; state.catalog.finish = ''; location.hash = `#/catalog/${state.catalog.category}`; renderCatalog(); });
$('#filterSeason').addEventListener('change', event => { state.catalog.season = event.target.value; renderCatalog(); });
$('#toggleFilters').addEventListener('click', () => $('#catalogFilters').classList.toggle('open'));
$('#clearFilters').addEventListener('click', () => resetFilters());
$('#emptyClear').addEventListener('click', () => resetFilters());
$('#favoritesOpen').addEventListener('click', () => { location.hash = '#/favorites'; });
$('#cartOpen').addEventListener('click', () => { renderDrawer(); activateOverlay($('#cartDrawer')); });
$('#cartClose').addEventListener('click', closeLayers);
$('#searchOpen').addEventListener('click', () => activateOverlay($('#searchModal')));
$('#mobileSearch').addEventListener('click', () => { $('#mobileMenu').hidden = true; activateOverlay($('#searchModal')); });
$('#searchClose').addEventListener('click', closeLayers);
$('#overlay').addEventListener('click', closeLayers);
$('#menuToggle').addEventListener('click', () => {
  const menu = $('#mobileMenu');
  const next = !menu.hidden;
  menu.hidden = next;
  $('#menuToggle').setAttribute('aria-expanded', String(!next));
});
$('#searchForm').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#searchInput').value.trim();
  state.catalog = { category: 'all', diameter: 'all', season: 'all', query, pcd: '', width: '', profile: '', et: '', finish: '' };
  closeLayers();
  if (location.hash !== '#/catalog/all') location.hash = '#/catalog/all';
  else { $$('.page').forEach(page => page.hidden = page.dataset.page !== 'catalog'); renderCatalog(); }
});
$('#checkoutForm').addEventListener('submit', handleCheckout);
$('#checkoutForm').addEventListener('input', () => { if (!submitting) stored('bieznik.checkout', null); });
$('#refreshOrder').addEventListener('click', () => showOrder(location.hash.split('/')[2]));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeLayers();
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && $('#searchModal').hidden) {
    event.preventDefault(); activateOverlay($('#searchModal'));
  }
  // Basic focus containment for modal drawers.
  if (event.key === 'Tab' && (!$('#cartDrawer').hidden || !$('#searchModal').hidden)) {
    const modal = !$('#cartDrawer').hidden ? $('#cartDrawer') : $('#searchModal');
    const focusable = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])', modal).filter(el => !el.hidden && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('hashchange', setRoute);

async function initialize() {
  let response;
  try {
    response = await api('/api/shop');
  } catch {
    $('#previewNotice').textContent = 'Nie udało się pobrać katalogu. Odśwież stronę i spróbuj ponownie.';
  }
  shop = response?.ordering ? response : null;
  products = shop
    ? shop.products.map(product => ({...product, price: product.priceCents / 100}))
    : PREVIEW_PRODUCTS.map(product => ({...product, priceCents: product.price * 100, stock: 20}));
  $('#previewNotice').hidden = shop?.paymentMode === 'live';
  if (shop?.paymentMode === 'sandbox') $('#previewNotice').textContent = 'Tryb testowy Przelewy24. Zamówienia nie są realizowane.';
  if (shop) {
    const merchant = shop.merchant;
    $('#merchantDetails').textContent = [merchant.name, merchant.address, merchant.taxId && ('NIP ' + merchant.taxId)].filter(Boolean).join(' · ');
    $('#merchantEmail').textContent = merchant.email;
    $('#merchantEmail').href = 'mailto:' + merchant.email;
    if (merchant.phone) {
      $('#merchantPhone').textContent = merchant.phone;
      $('#merchantPhone').href = 'tel:' + merchant.phone;
      $('#merchantPhone').hidden = false;
    }
    $('#checkoutTerms').href = $('#storeTerms').href = merchant.termsUrl;
    $('#checkoutPrivacy').href = $('#storePrivacy').href = merchant.privacyUrl;
    $('#merchantInfo').hidden = false;
    $('#shopPolicies').hidden = false;
  }

  const previousOrder = stored('bieznik.order');
  if (orderIdPattern.test(previousOrder ?? '')) rememberOrder(previousOrder);
  try {
    for (const [id, count] of JSON.parse(stored('bieznik.cart') || '[]')) {
      if (findProduct(id) && Number.isInteger(count) && count > 0) state.cart.set(id, Math.min(count, 20));
    }
  } catch {
    stored('bieznik.cart', null);
  }

  configureFinder();
  showFinderType('tires');
  renderFeatured();
  updateCounters();
  renderDrawer();
  setRoute();
}

initialize();
