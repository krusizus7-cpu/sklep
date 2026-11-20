'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { shippingCost } from '@/lib/shipping.mjs';
import { money, type Product, type ShippingRates } from '@/lib/types';
import { useBasket } from './basket';

const quantities = [1, 2, 4];

export function ProductPurchase({product, rates}: {product: Product; rates?: ShippingRates}) {
  const basket = useBasket();
  const inBasket = basket.quantityFor(product.id);
  return <PurchaseControls product={product} rates={rates} ready={basket.ready} basketCount={basket.count}
    inBasket={inBasket} remaining={basket.remainingFor(product)} onAdd={n => basket.setQuantity(product, inBasket + n)}/>;
}

export function PreviewPurchase({product, rates, limit, actionContainer}: {
  product: Product; rates?: ShippingRates; limit: number; actionContainer: HTMLDivElement | null;
}) {
  const [added, setAdded] = useState(0);
  return <PurchaseControls product={product} rates={rates} ready basketCount={added} inBasket={added}
    remaining={Math.max(0, Math.min(product.stock, limit) - added)} onAdd={n => setAdded(added + n)} actionContainer={actionContainer} preview/>;
}

function PurchaseControls({product, rates, ready, remaining, inBasket, basketCount, onAdd, preview, actionContainer}: {
  product: Product; rates?: ShippingRates; ready: boolean; remaining: number; inBasket: number;
  basketCount: number; onAdd: (n: number) => void; preview?: boolean; actionContainer?: HTMLDivElement | null;
}) {
  const [choice, setChoice] = useState(1);
  if (!product.stock) return <p className="stock-label">Niedostępny</p>;

  const quantity = choice <= remaining ? choice : Math.min(remaining, 1);
  const subtotal = product.priceCents * quantity;
  const delivery = rates ? shippingCost(rates, quantity) : undefined;
  const actions = <div className="purchase-action">
    <button className="btn btn-red" type="button" disabled={!ready || quantity === 0}
      onClick={() => {
        onAdd(quantity);
        setChoice(quantity);
      }}>
      {quantity > 0 ? `Dodaj ${quantity} szt. do koszyka` : 'Dodaj do koszyka'}
    </button>
    {preview && inBasket > 0 && <span role="status">W podglądzie: {inBasket} szt.</span>}
    {!preview && inBasket > 0 && <Link href="/koszyk" aria-label={`W koszyku: ${inBasket} szt. Przejdź do koszyka`}>
      W koszyku: {inBasket} szt. <span aria-hidden="true">→</span>
    </Link>}
  </div>;

  return <div className="product-purchase">
    <fieldset className="purchase-quantities" disabled={!ready}>
      <legend>Ile sztuk dodać?</legend>
      <div className="purchase-options">
        {quantities.map(option => <label key={option}>
          <input className="visually-hidden" type="radio" name="quantity" value={option}
            checked={option === quantity} disabled={option > remaining} onChange={() => setChoice(option)}/>
          <span>{option} szt.</span>
        </label>)}
      </div>
    </fieldset>
    {quantity > 0 ? <dl className="purchase-prices" aria-live="polite">
      <div><dt>Produkty ({quantity} szt.)</dt><dd>{money(subtotal)}</dd></div>
      {delivery !== undefined && <>
        <div><dt>{basketCount ? 'Dostawa przy osobnym zakupie' : 'Dostawa kurierem'}</dt><dd>{money(delivery)}</dd></div>
        <div className="purchase-total"><dt>Razem z dostawą</dt><dd>{money(subtotal + delivery)}</dd></div>
      </>}
    </dl> : <p className="purchase-limit">Koszyk osiągnął limit dla tego produktu lub całego zamówienia.</p>}
    {actionContainer ? createPortal(actions, actionContainer) : actions}
  </div>;
}
