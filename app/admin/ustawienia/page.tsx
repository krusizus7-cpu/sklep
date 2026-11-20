import { AdminMutation } from '@/components/admin-mutation';
import { AdminHeading, AdminPanel, AdminStatus } from '@/components/admin-ui';
import { saveShopSetting } from '@/lib/admin-actions';
import { requireAdmin } from '@/lib/session';
import { runtime } from '@/lib/store';
import type { Merchant } from '@/lib/types';

function SettingFields({section, revision}: {section: string; revision: string}) {
  return <>
    <input type="hidden" name="section" value={section}/>
    <input type="hidden" name="revision" value={revision}/>
  </>;
}

export default async function AdminSettings() {
  await requireAdmin();
  const {orders, payment} = runtime();
  const settings = orders.settings();
  const merchant = settings.merchant as Merchant | null;
  const live = payment?.mode === 'live';

  return <>
    <AdminHeading title="Ustawienia" description="Konfiguracja sprzedawcy, dostawy i progów magazynowych."/>
    <div className="admin-settings-grid">
      <AdminPanel title="Dane sprzedawcy" className="admin-card-body">
        <AdminMutation action={saveShopSetting}>
          <SettingFields section="merchant" revision={settings.revision.merchant}/>
          <div className="admin-field-grid" key={settings.revision.merchant}>
            <label>Nazwa sprzedawcy<input type="text" name="name" defaultValue={merchant?.name} maxLength={200} required/></label>
            <label>Adres sprzedawcy<input type="text" name="address" defaultValue={merchant?.address} maxLength={200} required/></label>
            <label>E-mail sprzedawcy<input type="email" name="email" defaultValue={merchant?.email} maxLength={200} required/></label>
            <label>Telefon<input type="tel" name="phone" defaultValue={merchant?.phone} maxLength={30} required={live}/></label>
            <label>NIP<input type="text" name="taxId" defaultValue={merchant?.taxId} maxLength={30} required={live}/></label>
            <label>Adres regulaminu (HTTPS)<input type="url" name="termsUrl" defaultValue={merchant?.termsUrl} maxLength={500} required/></label>
            <label>Adres polityki prywatności (HTTPS)<input type="url" name="privacyUrl" defaultValue={merchant?.privacyUrl} maxLength={500} required/></label>
          </div>
          <button className="admin-button admin-primary" type="submit">Zapisz dane sprzedawcy</button>
        </AdminMutation>
      </AdminPanel>
      <div className="admin-column">
        <AdminPanel title="Dostawa kurierska" className="admin-card-body">
          <p>Opłata za pierwszą sztukę plus stawka za każdą kolejną. Kwoty wpisz w groszach.</p>
          <AdminMutation action={saveShopSetting}>
            <SettingFields section="shipping" revision={settings.revision.shipping}/>
            <div className="admin-field-grid" key={settings.revision.shipping}>
              <label>Pierwsza sztuka (gr)<input type="number" name="firstCents" min={0} max={100000}
                defaultValue={settings.shipping.firstCents} required/></label>
              <label>Kolejna sztuka (gr)<input type="number" name="additionalCents" min={0} max={100000}
                defaultValue={settings.shipping.additionalCents} required/></label>
            </div>
            <button className="admin-button admin-primary" type="submit">Zapisz stawki</button>
          </AdminMutation>
        </AdminPanel>
        <div id="magazyn">
          <AdminPanel title="Magazyn" className="admin-card-body">
            <AdminMutation action={saveShopSetting}>
              <SettingFields section="lowStock" revision={settings.revision.lowStock}/>
              <label key={settings.revision.lowStock}>Próg niskiego stanu (szt.)<input type="number" name="lowStock" min={1} max={100000}
                defaultValue={settings.lowStock} required/></label>
              <button className="admin-button admin-primary" type="submit">Zapisz próg</button>
            </AdminMutation>
          </AdminPanel>
        </div>
        <AdminPanel title="Przelewy24" className="admin-card-body">
          <AdminStatus tone={live ? 'good' : 'warn'}>{live ? 'Produkcja' : payment ? 'Sandbox' : 'Podgląd'}</AdminStatus>
          <p>Tryb płatności i klucze integracji są konfigurowane na serwerze.</p>
        </AdminPanel>
      </div>
    </div>
  </>;
}
