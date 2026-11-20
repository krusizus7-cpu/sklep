'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { shippingCost } from '@/lib/shipping.mjs';
import { type Product, type Shop, type PaymentView, money } from '@/lib/types';
import { useBasket } from './basket';

function previousRequest() {
  try {
    return sessionStorage.getItem('bieznik.checkout');
  } catch {
    return null;
  }
}
function saveRequestId(id: string | null) {
  try {
    if (id) sessionStorage.setItem('bieznik.checkout', id);
    else sessionStorage.removeItem('bieznik.checkout');
  } catch { /* storage is optional */ }
}

export function Checkout({shop, checkout = false, email}: {shop: Shop; checkout?: boolean; email?: string}) {
  const {ready, items, setQuantity, remove, clear} = useBasket();
  const totalUnits = Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
  const products = new Map(shop.products.map(product => [product.id, product]));
  const lines = Object.entries(items).map(([id, quantity]) => ({id, quantity, product: products.get(id)}));
  const subtotal = lines.reduce((sum, {quantity, product}) => sum + quantity * (product?.priceCents ?? 0), 0);
  const shipping = shop.ordering ? shippingCost(shop.shipping, totalUnits) : 0;
  const valid = totalUnits <= shop.maxUnits && lines.every(({quantity, product}) => product && quantity <= product.stock);
  const retryId = useRef<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  useEffect(() => { setCanRetry(Boolean(previousRequest())); }, []);
  const retryAvailable = canRetry && totalUnits <= shop.maxUnits && lines.every(({product}) => product);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lastOrder, setLastOrder] = useState<PaymentView | null>(null);

  function resetRequest() {
    retryId.current = null;
    saveRequestId(null);
    setCanRetry(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!valid && !retryAvailable) || pending || !shop.ordering) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    retryId.current ??= previousRequest() || crypto.randomUUID();
    saveRequestId(retryId.current);
    setPending(true);
    setCanRetry(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          requestId: retryId.current, expectedTotal: subtotal + shipping,
          customer: {...fields, termsAccepted: fields.termsAccepted === 'on'},
          items: lines.map(({id, quantity}) => ({id, quantity}))
        })
      });
      const result = await response.json() as PaymentView & {error?: string};
      if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać zamówienia.');
      setLastOrder(result);
      try { sessionStorage.setItem('bieznik.order', result.id); } catch { /* storage is optional */ }
      clear();
      resetRequest();
      location.assign(result.paymentUrl || '/zamowienia/' + result.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nie udało się zapisać zamówienia.');
    } finally {
      setPending(false);
    }
  }

  if (checkout && !shop.ordering) return <p>Składanie zamówień jest obecnie niedostępne. <Link href="/koszyk">Wróć do koszyka</Link>.</p>;
  if (lastOrder) return <p>Zapisano zamówienie. <a href={lastOrder.paymentUrl || '/zamowienia/' + lastOrder.id}>Przejdź dalej</a>.</p>;
  if (!ready) return <p>Wczytywanie koszyka…</p>;
  if (!lines.length) return <div className="empty"><h2>Twój koszyk jest pusty</h2><Link href="/oferta" className="btn btn-red">Zobacz ofertę</Link></div>;
  const change = (product: Product, quantity: number) => { resetRequest(); setQuantity(product, quantity); };
  return <div className={checkout ? 'checkout-layout' : 'cart-layout'}>
    {checkout && shop.ordering ? <form className="panel-form" onSubmit={submit} onChange={() => { if (retryId.current) resetRequest(); }}>
      <fieldset disabled={pending}>
        <legend>Dane kontaktowe</legend>
        <label>Imię i nazwisko <input name="name" autoComplete="shipping name" maxLength={120} required/></label>
        <div className="form-duo"><label>E-mail <input type="email" name="email" autoComplete="shipping email" defaultValue={email} maxLength={50} required/></label>
          <label>Telefon <input type="tel" name="phone" autoComplete="shipping tel" maxLength={24} required/></label></div>
      </fieldset>
      <fieldset disabled={pending}>
        <legend>Adres dostawy</legend>
        <label>Ulica, numer domu i mieszkania <input name="street" autoComplete="shipping address-line1" maxLength={160} required/></label>
        <div className="form-duo"><label>Kod pocztowy <input name="postcode" autoComplete="shipping postal-code" placeholder="00-001" pattern="[0-9]{2}-[0-9]{3}" maxLength={6} required/></label>
          <label>Miejscowość <input name="city" autoComplete="shipping address-level2" maxLength={100} required/></label></div>
        <p>Kurier · dostawa na terenie Polski</p>
      </fieldset>
      <label className="checkbox-line"><input name="termsAccepted" type="checkbox" disabled={pending} required/>
        <span>Akceptuję <a href={shop.merchant.termsUrl} target="_blank" rel="noreferrer">regulamin sklepu</a>.</span></label>
      <p className="checkout-privacy"><a href={shop.merchant.privacyUrl} target="_blank" rel="noreferrer">Polityka prywatności</a></p>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <button className="btn btn-red btn-wide" type="submit" disabled={(!valid && !retryAvailable) || pending}>{pending ? 'Łączenie z Przelewy24…' : 'Zamawiam i płacę'}</button>
    </form> : <div className="cart-lines">{lines.map(({id, quantity, product}) => <article className="cart-line" key={id}>
      {product && <Link href={'/produkt/' + id} className="cart-thumb"><img src={product.image} alt={product.name}/></Link>}
      <div className="cart-item-main">
        <h2>{product ? product.brand + ' ' + product.name : 'Produkt niedostępny'}</h2>
        {product && <p>{product.size} · {money(product.priceCents)} / szt.</p>}
        <button type="button" onClick={() => { resetRequest(); remove(id); }}>Usuń z koszyka</button>
      </div>
      {product && <div className="cart-line-right"><strong>{money(product.priceCents * quantity)}</strong>
        <div className="mini-step">
          <button onClick={() => change(product, quantity - 1)} type="button" aria-label={'Zmniejsz ilość: ' + product.name}>−</button><span>{quantity}</span>
          <button onClick={() => change(product, quantity + 1)} type="button" aria-label={'Zwiększ ilość: ' + product.name}>+</button>
        </div>
      </div>}
    </article>)}</div>}
    <aside className="checkout-summary">
      <h2>Podsumowanie</h2>
      {checkout && lines.map(({id, quantity, product}) => product && <div className="checkout-summary-item" key={id}>
        <span>{product.brand} {product.name} × {quantity}</span><strong>{money(product.priceCents * quantity)}</strong>
      </div>)}
      {shop.ordering && <div className="checkout-summary-item"><span>Dostawa kurierem</span><strong id="shipping">{money(shipping)}</strong></div>}
      <div className="summary-total"><span>Razem brutto</span><strong id="checkoutTotal">{money(subtotal + shipping)}</strong></div>
      {shop.ordering ? <p>Płatność online przez Przelewy24.</p> : <p>Sprzedaż jest obecnie niedostępna.</p>}
      {!valid && !retryAvailable && <p className="checkout-error" role="alert">Wybrana ilość jest niedostępna. <Link href="/koszyk">Zaktualizuj koszyk</Link>.</p>}
      {!checkout && shop.ordering && (valid || retryAvailable) && <Link href="/zamowienie" className="btn btn-red btn-wide">Przejdź do zamówienia</Link>}
    </aside>
  </div>;
}
