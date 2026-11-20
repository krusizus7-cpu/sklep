// Segmenty handlowe stosowane w katalogu BIEŻNIK.
export const vehicleLabels = {passenger: 'Osobowe', suv: 'SUV / 4×4', van: 'Dostawcze'};
export const tierLabels = {premium: 'Premium', mid: 'Średnia', economy: 'Ekonomiczna'};
export const materialLabels = {alloy: 'Aluminiowe', steel: 'Stalowe'};
export const styleLabels = {classic: 'Klasyczne / codzienne', sport: 'Sportowe / tuningowe', premium: 'Do aut premium i SUV-ów'};

export const tireBrands = {
  premium: ['Bridgestone', 'Continental', 'Dunlop', 'Goodyear', 'Michelin', 'Nokian Tyres', 'Pirelli', 'Vredestein', 'Yokohama'],
  mid: ['BFGoodrich', 'Toyo', 'Alliance', 'Solideal', 'Nexen', 'Kumho', 'Hankook', 'General', 'Fulda', 'Firestone', 'Falken', 'Uniroyal', 'Kleber'],
  economy: ['Sailun', 'RoadX', 'Optimo', 'Tracmax', 'Triangle', 'Fortune', 'Windforce', 'Powertrac', 'Dębica', 'Barum']
};
export const wheelBrands = {
  classic: ['Dezent', 'Borbet', 'Ronal', 'MAK', 'RC-Design', 'Dieve Neve', 'Rial'],
  sport: ['Japan Racing', 'Concaver', 'OZ Racing', 'BBS', 'Oxigin'],
  premium: ['Brock', 'GMP Italia', 'Fondmetal', 'Dotz', 'MAM']
};

function normalizeBrand(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function brandIndex(groups) {
  const index = new Map();
  for (const [group, names] of Object.entries(groups)) {
    for (const name of names) index.set(normalizeBrand(name), group);
  }
  return index;
}
const tierByBrand = brandIndex(tireBrands);
tierByBrand.set('nokian', 'premium');
tierByBrand.set('generaltire', 'mid');
const styleByBrand = brandIndex(wheelBrands);

export function productTier(product) {
  if (product.type === 'tires') return product.tier ?? tierByBrand.get(normalizeBrand(product.brand));
}
export function productStyle(product) {
  if (product.type === 'wheels' && product.material === 'alloy') {
    return product.style ?? styleByBrand.get(normalizeBrand(product.brand));
  }
}
