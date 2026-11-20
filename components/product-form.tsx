'use client';

import { useActionState, useRef, useState } from 'react';
import { saveProduct } from '@/lib/admin-actions';
import { ProductDetail } from './product-detail';
import { PreviewPurchase } from './product-purchase';
import { productFromForm } from '@/lib/product-input';
import type { ShippingRates, Product } from '@/lib/types';

export function ProductForm({product, revision, rates, limit}: {product?: Product; revision?: string | null; rates?: ShippingRates; limit: number}) {
  const [type, setType] = useState(product?.type ?? 'tires');
  const [result, action, pending] = useActionState(saveProduct, {});
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [actionContainer, setActionContainer] = useState<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<Product | null>(null);
  function showPreview() {
    if (!formRef.current) return;
    const draft = productFromForm(new FormData(formRef.current));
    if (!draft) return;
    const asset = /^\/assets\/[\w-]+\.(?:webp|png|jpe?g|svg)$/i;
    setPreview({
      ...draft,
      name: draft.name || 'Nazwa produktu',
      seasonLabel: draft.season && {summer: 'Letnia', winter: 'Zimowa', allseason: 'Całoroczna'}[draft.season],
      image: asset.test(draft.image) ? draft.image : '',
      labelImage: draft.labelImage && asset.test(draft.labelImage) ? draft.labelImage : undefined,
      eprelUrl: draft.eprelUrl?.startsWith('https://eprel.ec.europa.eu/') ? draft.eprelUrl : undefined
    });
    dialogRef.current?.showModal();
  }
  return <><form className="panel-form admin-form" ref={formRef} action={action}>
    <input type="hidden" name="revision" value={revision ?? ''}/>
    <input type="hidden" name="expectedStock" value={product?.stock ?? ''}/>
    <div className="form-duo">
      <label>SKU<input name="id" defaultValue={product?.id} readOnly={Boolean(product)} pattern={String.raw`[A-Za-z0-9_\-]{1,64}`} maxLength={64} required/></label>
      <label>Rodzaj<select name="type" value={type} onChange={e => setType(e.currentTarget.value as Product['type'])}><option value="tires">Opona</option><option value="wheels">Felga</option></select></label>
    </div>
    <div className="form-duo">
      <label>Marka<input name="brand" defaultValue={product?.brand} required maxLength={200}/></label>
      <label>Nazwa<input name="name" defaultValue={product?.name} required maxLength={200}/></label>
    </div>
    <div className="form-duo">
      <label>Rozmiar<input name="size" defaultValue={product?.size} required maxLength={200}/></label>
      <label>Średnica w calach<input type="number" name="diameter" defaultValue={product?.diameter} min={8} max={40} required/></label>
    </div>
    {type === 'tires' ? <div className="form-duo">
      <label>Szerokość w mm<input type="number" name="width" defaultValue={product?.width} min={100} max={400} required/></label>
      <label>Profil<input type="number" name="profile" defaultValue={product?.profile} min={15} max={95} required/></label>
      <label>Sezon<select name="season" defaultValue={product?.season ?? 'summer'}>
        <option value="summer">Letnia</option><option value="winter">Zimowa</option><option value="allseason">Całoroczna</option>
      </select></label>
      <label>Karta EPREL<input type="url" name="eprelUrl" defaultValue={product?.eprelUrl} maxLength={500}/></label>
      <label>Ścieżka do etykiety UE<input name="labelImage" defaultValue={product?.labelImage} placeholder="/assets/etykieta.webp"/></label>
    </div> : <div className="form-duo">
      <label>PCD<input name="pcd" defaultValue={product?.pcd} placeholder="5x112" required/></label>
      <label>ET<input name="et" defaultValue={product?.et} placeholder="45" required/></label>
      <label>Wykończenie<input name="finish" defaultValue={product?.finish} required/></label>
    </div>}
    <div className="form-duo">
      <label>Cena brutto w groszach<input type="number" name="priceCents" defaultValue={product?.priceCents} min={1} max={10000000} required/></label>
      <label>Sztuki dostępne do sprzedaży<input type="number" name="stock" defaultValue={product?.stock ?? 0} min={0} max={100000} required/></label>
    </div>
    <label>Ścieżka do zdjęcia<input name="image" defaultValue={product?.image} placeholder="/assets/produkt.webp" required/></label>
    <label><span id="product-description-label">Opis</span><textarea aria-labelledby="product-description-label" name="description" rows={4} defaultValue={product?.description} required maxLength={1000}/></label>
    {result.error && <p className="checkout-error" role="alert">{result.error}</p>}
    <div className="account-actions">
      <button className="btn btn-border" type="button" onClick={showPreview}>Podgląd mobilny</button>
      <button className="btn btn-red" disabled={pending}>Zapisz produkt</button>
    </div>
  </form>
  <dialog ref={dialogRef} className="mobile-preview" aria-labelledby="preview-title" onClose={() => setPreview(null)}>
    <header><h2 id="preview-title">Podgląd mobilny</h2>
      <button type="button" className="btn btn-border" onClick={() => dialogRef.current?.close()}>Zamknij</button>
    </header>
    <div className="preview-content">{preview && <ProductDetail product={preview} ordering={Boolean(rates)}>
      {Number.isFinite(preview.priceCents) && Number.isFinite(preview.stock)
        ? <PreviewPurchase product={preview} rates={rates} limit={limit} actionContainer={actionContainer}/>
        : <p>Uzupełnij cenę i liczbę dostępnych sztuk.</p>}
    </ProductDetail>}</div>
    <div className="preview-footer" ref={setActionContainer}/>
  </dialog></>;
}
