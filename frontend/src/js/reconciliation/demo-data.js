import configuration from './fixtures/banks.json';

// Frontend demonstration only. These are NOT real Pluggy IDs or credentials.
export const demoBanks = configuration.items;
export const demoTransactions = [
    { id: 'demo-01', item_id: 'demo-nubank', description: 'Supermercado São João', date: '2026-10-22', signed_amount_cents: -18490 },
    { id: 'demo-02', item_id: 'demo-santander', description: 'Salário', date: '2026-10-21', signed_amount_cents: 450000 },
    { id: 'demo-03', item_id: 'demo-digio', description: 'Farmácia', date: '2026-10-21', signed_amount_cents: -6750 },
    { id: 'demo-04', item_id: 'demo-nubank', description: 'Padaria', date: '2026-10-20', signed_amount_cents: -2380 },
];

// The existing transaction form selects a category and displays its icon.
export const demoCategories = [
    { id: 90001, name: 'Alimentação', type: 'expense', icon: 'cart', color: '#F66A54', is_active: true },
    { id: 90002, name: 'Saúde', type: 'expense', icon: 'heart', color: '#E8567A', is_active: true },
    { id: 90003, name: 'Outras despesas', type: 'expense', icon: 'tag', color: '#7F62D9', is_active: true },
    { id: 90004, name: 'Salário', type: 'income', icon: 'money_dollar_circle', color: '#19B581', is_active: true },
    { id: 90005, name: 'Outras receitas', type: 'income', icon: 'tag', color: '#1564FF', is_active: true },
];
