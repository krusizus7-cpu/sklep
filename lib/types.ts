export type Product = {
  id: string;
  type: 'tires' | 'wheels';
  brand: string;
  name: string;
  size: string;
  diameter: number;
  width?: number;
  profile?: number;
  season?: 'summer' | 'winter' | 'allseason';
  seasonLabel?: string;
  pcd?: string;
  et?: string;
  finish?: string;
  priceCents: number;
  stock: number;
  image: string;
  labelImage?: string;
  eprelUrl?: string;
  description: string;
};

export type Merchant = {
  name: string; address: string; email: string; taxId?: string; phone?: string; termsUrl: string; privacyUrl: string;
};

export type Shop = {
  products: Product[];
  maxPerProduct: number;
  maxUnits: number;
} & ({ ordering: false } | {
  ordering: true; paymentMode: 'sandbox' | 'live'; merchant: Merchant;
  shipping: { firstCents: number; additionalCents: number };
});

export type Account = {id: string; email: string; role: 'customer' | 'admin'};
export type OrderItem = {id: string; quantity: number; priceCents: number; name: string; size: string};
export type OrderStatus = 'registering' | 'pending' | 'paid' | 'shipped' | 'cancelled';
export type OrderSummary = {
  id: string; status: OrderStatus; total: number; createdAt: string; shippedAt?: string;
};
export type OrderHistory = OrderSummary & {
  items: OrderItem[]; shipping: number; trackingNumber?: string;
};
export type OrderDetails = OrderHistory & {
  customer: {name: string; email: string; phone: string; street: string; postcode: string; city: string};
};
export type PaymentView = {id: string; total: number; status: OrderStatus; paymentUrl?: string; trackingNumber?: string};
export const statusNames: Record<OrderStatus, string> = {
  registering: 'Rejestracja płatności', pending: 'Oczekuje na płatność', paid: 'Opłacone',
  shipped: 'Wysłane', cancelled: 'Anulowane'
};
export const money = (cents: number) => new Intl.NumberFormat('pl-PL', {style: 'currency', currency: 'PLN'}).format(cents / 100);
export const date = (stamp: string) => new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Warsaw'
}).format(new Date(stamp));
