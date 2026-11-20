import Link from 'next/link';
import { AdminEmpty, AdminHeading } from '@/components/admin-ui';

export default function AdminNotFound() {
  return <>
    <AdminHeading title="Nie znaleziono rekordu"/>
    <AdminEmpty message="Sprawdź adres lub wróć do przeglądu panelu.">
      <Link className="admin-button" href="/admin">Przejdź do przeglądu</Link>
    </AdminEmpty>
  </>;
}
