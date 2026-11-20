import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { readShop } from '@/lib/store';
import { money } from '@/lib/types';

export default async function AdminProducts() {
  await requireAdmin();
  const {products} = readShop();
  return <>
    <div className="page-intro"><h1>Produkty i magazyn</h1></div>
    <Link href="/admin/produkty/nowy" className="btn btn-red">Dodaj produkt</Link>
    <div className="table-scroll"><table>
      <caption className="visually-hidden">Produkty</caption>
      <thead><tr><th scope="col">Produkt</th><th scope="col">SKU</th><th scope="col">Cena brutto</th><th scope="col">Dostępne</th></tr></thead>
      <tbody>{products.map(product => <tr key={product.id}>
        <th scope="row"><Link href={'/admin/produkty/' + product.id + '?edit=1'}>{product.brand} {product.name}</Link></th>
        <td>{product.id}</td><td>{money(product.priceCents)}</td><td>{product.stock}</td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
