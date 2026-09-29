export const TIERS = [
  { at: 5, off: 5 },
  { at: 10, off: 10 },
  { at: 20, off: 15 },
];

export const seedEntries = [
  { id: 1, type: 'sale', item: 'Maize, 40 bags', amount: 14200, location: 'Polokwane', month: 'May' },
  { id: 2, type: 'expense', item: 'LAN fertiliser, 20 bags', amount: 6800, location: 'Polokwane', month: 'May' },
  { id: 3, type: 'sale', item: 'Tomatoes, 120 crates', amount: 9600, location: 'Polokwane', month: 'Jun' },
  { id: 4, type: 'expense', item: 'Drip pipe and fittings', amount: 4100, location: 'Polokwane', month: 'Jun' },
  { id: 5, type: 'sale', item: 'Sunflower, 18 bags', amount: 11800, location: 'Polokwane', month: 'Jul' },
  { id: 6, type: 'expense', item: 'Maize seed, 50kg', amount: 7300, location: 'Polokwane', month: 'Jul' },
  { id: 7, type: 'sale', item: 'Cabbage, 300 heads', amount: 5400, location: 'Polokwane', month: 'Aug' },
  { id: 8, type: 'expense', item: 'Diesel and labour', amount: 6100, location: 'Polokwane', month: 'Aug' },
  { id: 9, type: 'sale', item: 'Maize, 55 bags', amount: 19800, location: 'Polokwane', month: 'Sep' },
  { id: 10, type: 'expense', item: 'Pesticide, 10L', amount: 3200, location: 'Polokwane', month: 'Sep' },
];

export const seedGroups = [
  { id: 1, inputName: 'LAN fertiliser, 50kg', supplierName: 'Limpopo Agri Co-op', area: 'Polokwane and Seshego', memberCount: 7, price: 465,
    reason: '7 farmers within 30 km logged this input in the last 9 days.' },
  { id: 2, inputName: 'Hybrid maize seed, 25kg', supplierName: 'Mankweng Farm Supplies', area: 'Mankweng', memberCount: 12, price: 890,
    reason: 'Planting window opens in 2 weeks. 12 farmers bought seed in this window last year.' },
  { id: 3, inputName: 'Drip line, 100m roll', supplierName: 'Tzaneen Irrigation Hub', area: 'Tzaneen', memberCount: 3, price: 1240,
    reason: '3 farmers logged irrigation costs this week. 2 more unlock the first discount.' },
];

export const seedSuppliers = [
  { id: 1, name: 'Limpopo Agri Co-op', area: 'Polokwane', type: 'Co-operative', stock: ['Fertiliser', 'Seed', 'Feed'], phone: '015 000 0101', open: 1 },
  { id: 2, name: 'Mankweng Farm Supplies', area: 'Mankweng', type: 'Agri-store', stock: ['Seed', 'Chemicals'], phone: '015 000 0202', open: 1 },
  { id: 3, name: 'Tzaneen Irrigation Hub', area: 'Tzaneen', type: 'Agri-store', stock: ['Irrigation', 'Tools'], phone: '015 000 0303', open: 0 },
  { id: 4, name: 'Bochum Grain Growers', area: 'Bochum', type: 'Co-operative', stock: ['Seed', 'Fertiliser'], phone: '015 000 0404', open: 1 },
];
