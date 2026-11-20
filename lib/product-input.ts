import type { Product } from './types';

const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const integer = (form: FormData, key: string) => {
  const value = field(form, key);
  return /^\d+$/.test(value) ? Number(value) : NaN;
};

export function productFromForm(form: FormData): Product | null {
  const type = field(form, 'type');
  if (type !== 'tires' && type !== 'wheels') return null;
  const common = {
    type, id: field(form, 'id'), brand: field(form, 'brand'), name: field(form, 'name'), size: field(form, 'size'),
    diameter: integer(form, 'diameter'), priceCents: integer(form, 'priceCents'), stock: integer(form, 'stock'),
    image: field(form, 'image'), description: field(form, 'description')
  };
  return (type === 'tires' ? {
    ...common, width: integer(form, 'width'), profile: integer(form, 'profile'), season: field(form, 'season'),
    eprelUrl: field(form, 'eprelUrl') || undefined, labelImage: field(form, 'labelImage') || undefined
  } : {...common, pcd: field(form, 'pcd'), et: field(form, 'et'), finish: field(form, 'finish')}) as Product;
}
