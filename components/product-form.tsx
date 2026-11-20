'use client';

import { useActionState, useState } from 'react';
import { saveProduct } from '@/lib/admin-actions';
import { materialLabels, productStyle, productTier, styleLabels, tierLabels, tireBrands, vehicleLabels, wheelBrands } from '@/lib/assortment.mjs';
import type { Product } from '@/lib/types';

function ClassificationSelect({label, name, options, initial, placeholder = 'Nie określono'}: {
  label: string; name: string; options: Record<string, string>; initial?: string; placeholder?: string;
}) {
  return <label>{label}<select name={name} defaultValue={initial ?? ''}>
    <option value="">{placeholder}</option>
    {Object.entries(options).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
  </select></label>;
}

export function ProductForm({product, revision}: {product?: Product; revision?: string | null}) {
  const [type, setType] = useState(product?.type ?? 'tires');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [material, setMaterial] = useState<string>(product?.material ?? '');
  const brands = type === 'tires' ? Object.values(tireBrands).flat() : type === 'wheels' ? Object.values(wheelBrands).flat() : [];
  const inferredTier = productTier({type, brand}) as keyof typeof tierLabels | undefined;
  const inferredStyle = productStyle({type, brand, material}) as keyof typeof styleLabels | undefined;
  const [result, action, pending] = useActionState(saveProduct, {});
  return <form className="panel-form admin-form" action={action}>
    <input type="hidden" name="revision" value={revision ?? ''}/>
    <input type="hidden" name="expectedStock" value={product?.stock ?? ''}/>
    <div className="form-duo">
      <label>SKU<input name="id" defaultValue={product?.id} readOnly={Boolean(product)} pattern={String.raw`[A-Za-z0-9_\-]{1,64}`} maxLength={64} required/></label>
      <label>Rodzaj<select name="type" value={type} onChange={e => setType(e.currentTarget.value as Product['type'])}><option value="tires">Opona</option><option value="wheels">Felga</option><option value="hubcaps">Kołpak</option></select></label>
    </div>
    <div className="form-duo">
      <label>Marka<input name="brand" list={brands.length ? 'product-brands' : undefined} value={brand} onChange={event => setBrand(event.target.value)} required maxLength={200}/></label>
      <label>Nazwa<input name="name" defaultValue={product?.name} required maxLength={200}/></label>
    </div>
    <datalist id="product-brands">{brands.map(name => <option key={name} value={name}/>)}</datalist>
    <div className="form-duo">
      <label>Rozmiar<input name="size" defaultValue={product?.size} required maxLength={200}/></label>
      <label>Średnica w calach<input type="number" name="diameter" defaultValue={product?.diameter} min={type === 'hubcaps' ? 13 : 8} max={type === 'hubcaps' ? 17 : 40} required/></label>
    </div>
    {type !== 'hubcaps' && <div className="form-duo">
      <ClassificationSelect label="Typ pojazdu" name="vehicle" options={vehicleLabels} initial={product?.vehicle}/>
      {type === 'tires' ? <ClassificationSelect label="Klasa opony" name="tier" options={tierLabels} initial={product?.tier}
        placeholder={inferredTier ? 'Według marki — ' + tierLabels[inferredTier] : 'Według marki'}/> : <>
        <label>Materiał felgi<select name="material" value={material} onChange={event => setMaterial(event.target.value)}>
          <option value="">Nie określono</option>
          {Object.entries(materialLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {material === 'alloy' && <ClassificationSelect label="Styl alufelgi" name="style" options={styleLabels} initial={product?.style}
          placeholder={inferredStyle ? 'Według marki — ' + styleLabels[inferredStyle] : 'Według marki'}/>}
      </>}
    </div>}
    {type === 'tires' ? <div className="form-duo">
      <label>Szerokość w mm<input type="number" name="width" defaultValue={product?.width} min={100} max={400} required/></label>
      <label>Profil<input type="number" name="profile" defaultValue={product?.profile} min={15} max={95} required/></label>
      <label>Sezon<select name="season" defaultValue={product?.season ?? 'summer'}>
        <option value="summer">Letnia</option><option value="winter">Zimowa</option><option value="allseason">Całoroczna</option>
      </select></label>
      <label>Karta EPREL<input type="url" name="eprelUrl" defaultValue={product?.eprelUrl} maxLength={500}/></label>
      <label>Ścieżka do etykiety UE<input name="labelImage" defaultValue={product?.labelImage} placeholder="/assets/etykieta.webp"/></label>
    </div> : type === 'wheels' && <div className="form-duo">
      <label>PCD<input name="pcd" defaultValue={product?.pcd} placeholder="5x112" required/></label>
      <label>ET<input name="et" defaultValue={product?.et} placeholder="45" required/></label>
      <label>Wykończenie<input name="finish" list={material === 'steel' ? 'steel-finishes' : undefined} defaultValue={product?.finish} required/></label>
      {material === 'steel' && <datalist id="steel-finishes"><option value="Czarne"/><option value="Srebrne"/></datalist>}
    </div>}
    <div className="form-duo">
      <label>Cena brutto w groszach<input type="number" name="priceCents" defaultValue={product?.priceCents} min={1} max={10000000} required/></label>
      <label>Sztuki dostępne do sprzedaży<input type="number" name="stock" defaultValue={product?.stock ?? 0} min={0} max={100000} required/></label>
    </div>
    <label>Ścieżka do zdjęcia<input name="image" defaultValue={product?.image} placeholder="/assets/produkt.webp" required/></label>
    <label>Opis<textarea name="description" rows={4} defaultValue={product?.description} required maxLength={1000}/></label>
    {result.error && <p className="checkout-error" role="alert">{result.error}</p>}
    <button className="btn btn-red" disabled={pending}>Zapisz produkt</button>
  </form>;
}
