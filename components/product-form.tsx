'use client';

import { useActionState, useState } from 'react';
import { saveProduct } from '@/lib/admin-actions';
import { vehicleLabels, wetGripClasses } from '@/lib/tire-attributes.mjs';
import type { Product } from '@/lib/types';

export function ProductForm({product, revision, stockReasons}: {
  product?: Product; revision?: string | null; stockReasons: Record<string, string>;
}) {
  const [type, setType] = useState(product?.type ?? 'tires');
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [result, action, pending] = useActionState(saveProduct, {});
  return <form className="panel-form admin-form" action={action}>
    <h2>Dane produktu</h2>
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
      <label>Typ pojazdu<select name="vehicle" defaultValue={product?.vehicle ?? ''}>
        <option value="">Nie określono</option>
        {Object.entries(vehicleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label>Klasa przyczepności na mokrym<select name="wetGripClass" defaultValue={product?.wetGripClass ?? ''}>
        <option value="">Nie określono</option>
        {wetGripClasses.map(value => <option value={value} key={value}>{value}</option>)}
      </select></label>
      <label className="checkbox-line"><input type="checkbox" name="bestseller" defaultChecked={product?.bestseller}/> Oznacz jako bestseller</label>
      <label>Karta EPREL<input type="url" name="eprelUrl" defaultValue={product?.eprelUrl} maxLength={500}/></label>
      <label>Ścieżka do etykiety UE<input name="labelImage" defaultValue={product?.labelImage} placeholder="/assets/etykieta.webp"/></label>
    </div> : <div className="form-duo">
      <label>PCD<input name="pcd" defaultValue={product?.pcd} placeholder="5x112" required/></label>
      <label>ET<input name="et" defaultValue={product?.et} placeholder="45" required/></label>
      <label>Wykończenie<input name="finish" defaultValue={product?.finish} required/></label>
    </div>}
    <div className="form-duo">
      <label>Cena brutto w groszach<input type="number" name="priceCents" defaultValue={product?.priceCents} min={1} max={10000000} required/></label>
      <label>Sztuki dostępne do sprzedaży<input type="number" name="stock" value={stock} onChange={event => setStock(event.currentTarget.value)}
        min={0} max={100000} required/></label>
    </div>
    {product && Number(stock) !== product.stock && <label>Powód korekty<select name="stockReason" defaultValue="" required>
      <option value="" disabled>Wybierz powód</option>
      {Object.entries(stockReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>}
    <label>Ścieżka do zdjęcia<input name="image" defaultValue={product?.image} placeholder="/assets/produkt.webp" required/></label>
    <label>Opis<textarea name="description" rows={4} defaultValue={product?.description} required maxLength={1000}/></label>
    {result.error && <p className="checkout-error" role="alert">{result.error}</p>}
    <button className="btn btn-red" disabled={pending}>{pending ? 'Zapisywanie…' : 'Zapisz produkt'}</button>
  </form>;
}
