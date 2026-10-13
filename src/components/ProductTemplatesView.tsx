import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Search, Package, Check, CheckSquare, Square, ShoppingBasket, Smartphone,
  Shirt, Sparkles, Droplets, Refrigerator, House, Snowflake, CakeSlice, Sandwich,
  BookOpen, Hammer, Car, Sprout, Layers, Loader2, Import, AlertCircle, X, Plus
} from 'lucide-react';

export interface ProductTemplate {
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  description?: string;
}

export const PRODUCT_TEMPLATE_CATEGORIES = [
  { name: 'Drinks & Beverages', icon: Droplets, color: 'bg-sky-50 text-sky-700', subcategories: [
    ['Soft Drinks', 'Coca-Cola', 'Pepsi', 'Fanta', 'Sprite', '7UP', 'Mirinda', 'Schweppes'],
    ['Water', 'Bottled Water', 'Sachet Water', 'Sparkling Water'],
    ['Malt & Energy', 'Malt Drink', 'Energy Drink', 'Sports Drink'],
    ['Juice & Dairy Drinks', 'Fruit Juice', 'Orange Juice', 'Apple Juice', 'Yoghurt Drink', 'Flavoured Milk', 'Chocolate Milk']
  ]},
  { name: 'Groceries & Provisions', icon: ShoppingBasket, color: 'bg-emerald-50 text-emerald-700', subcategories: [
    ['Grains & Staples', 'Rice', 'Beans', 'Garri', 'Semolina', 'Wheat Meal', 'Corn Flour', 'Oats'],
    ['Pasta & Noodles', 'Spaghetti', 'Macaroni', 'Instant Noodles'],
    ['Cooking Ingredients', 'Vegetable Oil', 'Palm Oil', 'Sugar', 'Salt', 'Flour', 'Tomato Paste', 'Seasoning Cubes', 'Curry Powder', 'Thyme', 'Ground Pepper'],
    ['Canned & Breakfast', 'Milk Powder', 'Evaporated Milk', 'Breakfast Cereal', 'Cornflakes', 'Canned Sardines', 'Baked Beans', 'Peanut Butter']
  ]},
  { name: 'Phones & Electronics', icon: Smartphone, color: 'bg-indigo-50 text-indigo-700', subcategories: [
    ['Phones & Tablets', 'Mobile Phone', 'Tablet', 'Feature Phone'],
    ['Accessories', 'Phone Charger', 'USB Cable', 'Earphones', 'Headphones', 'Power Bank', 'Phone Case', 'Screen Protector', 'Memory Card', 'USB Flash Drive'],
    ['Electronics', 'Bluetooth Speaker', 'Extension Box', 'Rechargeable Lamp', 'Router', 'Computer Mouse', 'Keyboard', 'Laptop Charger']
  ]},
  { name: 'Fashion & Clothing', icon: Shirt, color: 'bg-pink-50 text-pink-700', subcategories: [
    ['Clothing', 'T-Shirt', 'Polo Shirt', 'Shirt', 'Trousers', 'Jeans', 'Dress', 'Skirt', 'Shorts', 'Underwear'],
    ['Footwear', 'Sneakers', 'Sandals', 'Slippers', 'Formal Shoes'],
    ['Accessories', 'Belt', 'Cap', 'Hat', 'Socks', 'Handbag', 'Wallet', 'Wristwatch']
  ]},
  { name: 'Cosmetics & Beauty', icon: Sparkles, color: 'bg-fuchsia-50 text-fuchsia-700', subcategories: [
    ['Skin Care', 'Body Lotion', 'Face Cream', 'Face Cleanser', 'Sunscreen', 'Petroleum Jelly'],
    ['Makeup', 'Lipstick', 'Lip Gloss', 'Face Powder', 'Foundation', 'Mascara', 'Eyeliner', 'Makeup Brush'],
    ['Hair & Fragrance', 'Hair Cream', 'Hair Relaxer', 'Hair Dye', 'Perfume', 'Body Spray', 'Deodorant']
  ]},
  { name: 'Toiletries & Personal Care', icon: Droplets, color: 'bg-cyan-50 text-cyan-700', subcategories: [
    ['Bath & Oral Care', 'Bathing Soap', 'Body Wash', 'Toothpaste', 'Toothbrush', 'Mouthwash', 'Bath Sponge'],
    ['Hygiene', 'Sanitary Pads', 'Baby Diapers', 'Adult Diapers', 'Wet Wipes', 'Tissue Paper', 'Cotton Wool'],
    ['Hair Care', 'Shampoo', 'Conditioner', 'Hair Comb', 'Hair Brush', 'Shaving Cream', 'Disposable Razor']
  ]},
  { name: 'Home Appliances', icon: Refrigerator, color: 'bg-orange-50 text-orange-700', subcategories: [
    ['Kitchen Appliances', 'Electric Kettle', 'Blender', 'Toaster', 'Microwave', 'Rice Cooker', 'Electric Cooker'],
    ['Home Electronics', 'Fan', 'Refrigerator', 'Freezer', 'Washing Machine', 'Television', 'Iron', 'Air Conditioner']
  ]},
  { name: 'Household Products', icon: House, color: 'bg-amber-50 text-amber-700', subcategories: [
    ['Cleaning', 'Laundry Detergent', 'Dishwashing Liquid', 'Bleach', 'Disinfectant', 'Floor Cleaner', 'Toilet Cleaner', 'Sponge'],
    ['Household Essentials', 'Bucket', 'Basin', 'Broom', 'Mop', 'Dustpan', 'Plastic Chair', 'Storage Container', 'Bedsheet', 'Pillow']
  ]},
  { name: 'Frozen Foods', icon: Snowflake, color: 'bg-blue-50 text-blue-700', subcategories: [
    ['Meat & Fish', 'Frozen Chicken', 'Frozen Turkey', 'Beef', 'Goat Meat', 'Frozen Fish', 'Stockfish'],
    ['Frozen & Chilled', 'Sausage', 'Ice Cream', 'Frozen Vegetables', 'Frozen Fries', 'Butter', 'Cheese']
  ]},
  { name: 'Bakery Products', icon: CakeSlice, color: 'bg-yellow-50 text-yellow-800', subcategories: [
    ['Bread & Pastries', 'Sliced Bread', 'Agege Bread', 'Sweet Bread', 'Meat Pie', 'Fish Roll', 'Doughnut', 'Cake Slice', 'Cupcake', 'Cookies']
  ]},
  { name: 'Food & Snacks', icon: Sandwich, color: 'bg-lime-50 text-lime-800', subcategories: [
    ['Snacks', 'Potato Chips', 'Plantain Chips', 'Biscuits', 'Crackers', 'Popcorn', 'Chin Chin', 'Groundnuts', 'Peanuts'],
    ['Quick Meals', 'Cup Noodles', 'Instant Pap', 'Custard Powder', 'Cereal Bar', 'Chocolate Bar', 'Candy', 'Chewing Gum']
  ]},
  { name: 'Stationery & Office Supplies', icon: BookOpen, color: 'bg-violet-50 text-violet-700', subcategories: [
    ['Writing', 'Pen', 'Pencil', 'Marker', 'Highlighter', 'Eraser', 'Sharpener'],
    ['Paper & Office', 'Exercise Book', 'Notebook', 'Printer Paper', 'Envelope', 'File Folder', 'Stapler', 'Staples', 'Ruler', 'Calculator']
  ]},
  { name: 'Building Materials & Hardware', icon: Hammer, color: 'bg-stone-100 text-stone-700', subcategories: [
    ['Building Materials', 'Cement', 'Roofing Sheet', 'Nails', 'Screws', 'Binding Wire', 'PVC Pipe', 'Paint', 'Tile Adhesive'],
    ['Tools & Electrical', 'Hammer', 'Screwdriver', 'Pliers', 'Tape Measure', 'Padlock', 'Light Bulb', 'Electrical Cable', 'Socket', 'Switch']
  ]},
  { name: 'Automotive Products', icon: Car, color: 'bg-red-50 text-red-700', subcategories: [
    ['Maintenance', 'Engine Oil', 'Brake Fluid', 'Coolant', 'Brake Pad', 'Oil Filter', 'Air Filter', 'Spark Plug'],
    ['Accessories', 'Car Battery', 'Tyre', 'Inner Tube', 'Car Wash Shampoo', 'Car Air Freshener', 'Wiper Blade', 'Motorcycle Helmet']
  ]},
  { name: 'Agricultural Products', icon: Sprout, color: 'bg-green-50 text-green-700', subcategories: [
    ['Farm Inputs', 'Fertilizer', 'Animal Feed', 'Poultry Feed', 'Seeds', 'Seedlings', 'Planting Bags', 'Farm Tools'],
    ['Produce', 'Maize', 'Cassava', 'Yam', 'Plantain', 'Palm Kernel', 'Groundnut', 'Soybeans']
  ]},
  { name: 'Other Products', icon: Layers, color: 'bg-slate-100 text-slate-700', subcategories: [
    ['General', 'Gift Item', 'Gift Bag', 'Recharge Card', 'SIM Card', 'Umbrella', 'Torchlight', 'Battery', 'Miscellaneous Item']
  ]}
].map((category) => ({
  ...category,
  products: category.subcategories.flatMap(([subcategory, ...names]) =>
    names.map((name) => ({
      name,
      category: category.name,
      subcategory,
      unit: 'pcs'
    } as ProductTemplate))
  )
}));

export const ProductTemplatesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentStore, products, categories, refreshStoreData, hasPermission, isStoreOwner } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState('Drinks & Beverages');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [report, setReport] = useState<{ imported: string[]; skipped: string[]; failed: string[] } | null>(null);
  const canCreate = isStoreOwner || hasPermission('products.create') || hasPermission('products.edit');

  const allTemplates = useMemo(() => PRODUCT_TEMPLATE_CATEGORIES.flatMap((category) => category.products), []);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term) return allTemplates.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.subcategory.toLowerCase().includes(term)
    );
    return allTemplates.filter((item) => item.category === activeCategory);
  }, [allTemplates, query, activeCategory]);
  const selectedTemplates = allTemplates.filter((item) => selected[item.name]);
  const alreadyExists = (template: ProductTemplate) => products.some((p) =>
    p.store_id === currentStore?.id &&
    (p.name.trim().toLocaleLowerCase() === template.name.trim().toLocaleLowerCase() ||
     Boolean(p.sku && p.sku.toLocaleLowerCase() === template.name.toLocaleLowerCase()) ||
     Boolean(p.barcode && p.barcode === template.name))
  );

  const toggle = (name: string) => setSelected((prev) => ({ ...prev, [name]: !prev[name] }));
  const toggleVisible = () => {
    const allSelected = visible.length > 0 && visible.every((item) => selected[item.name]);
    setSelected((prev) => {
      const next = { ...prev };
      visible.forEach((item) => { if (allSelected) delete next[item.name]; else next[item.name] = true; });
      return next;
    });
  };

  const [drafts, setDrafts] = useState<Record<string, { name: string; category: string; cost: string; selling: string; stock: string; minimum: string; unit: string; description: string }>>({});
  const updateDraft = (name: string, field: string, value: string) => setDrafts((prev) => ({
    ...prev,
    [name]: { name, category: PRODUCT_TEMPLATE_CATEGORIES.find((c) => c.name === allTemplates.find((t) => t.name === name)?.category)?.name || '', cost: '', selling: '', stock: '0', minimum: '5', unit: 'pcs', description: '', ...prev[name], [field]: value }
  }));

  const openReview = () => {
    setImportError('');
    setDrafts((prev) => {
      const next = { ...prev };
      selectedTemplates.forEach((item) => {
        if (!next[item.name]) next[item.name] = { name: item.name, category: item.category, cost: '', selling: '', stock: '0', minimum: '5', unit: item.unit, description: '' };
      });
      return next;
    });
    setReviewOpen(true);
  };

  const importSelected = async () => {
    if (!currentStore || !user || !canCreate) {
      setImportError('You do not have permission to import products into this store.');
      return;
    }
    setImporting(true);
    setImportError('');
    const nextReport = { imported: [] as string[], skipped: [] as string[], failed: [] as string[] };
    try {
      // Resolve existing store categories once; create missing categories through the same Supabase API.
      const categoryIds = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      for (const template of selectedTemplates) {
        const draft = drafts[template.name] || { name: template.name, category: template.category, cost: '', selling: '', stock: '0', minimum: '5', unit: 'pcs', description: '' };
        if (!draft.name.trim()) { nextReport.failed.push(template.name + ': product name is required'); continue; }
        if (alreadyExists({ ...template, name: draft.name })) { nextReport.skipped.push(template.name); continue; }
        try {
          let categoryId = categoryIds.get(draft.category.toLowerCase()) || null;
          if (!categoryId) {
            const { data: categoryRow, error: categoryError } = await supabase
              .from('categories').insert({ store_id: currentStore.id, name: draft.category }).select('id').single();
            if (categoryError) throw categoryError;
            categoryId = categoryRow.id;
            categoryIds.set(draft.category.toLowerCase(), categoryId);
          }
          const sku = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
          const stock = Number(draft.stock || 0);
          const { data: saved, error } = await supabase.from('products').insert({
            store_id: currentStore.id,
            name: draft.name.trim(),
            sku,
            category_id: categoryId,
            category_name: draft.category || null,
            description: draft.description.trim() || null,
            cost_price: draft.cost.trim() === '' ? 0 : Number(draft.cost),
            selling_price: draft.selling.trim() === '' ? 0 : Number(draft.selling),
            current_stock: stock,
            min_stock_level: Number(draft.minimum || 0),
            unit: draft.unit.trim() || 'pcs',
            supplier_id: null,
            status: 'active'
          }).select().single();
          if (error) throw error;
          if (stock > 0) {
            const { error: movementError } = await supabase.from('inventory_movements').insert({
              store_id: currentStore.id, product_id: saved.id, type: 'initial', quantity: stock,
              previous_stock: 0, new_stock: stock, reason: 'Initial stock intake upon template import',
              performed_by: user.email || user.id
            });
            if (movementError) console.warn('Initial stock movement could not be recorded:', movementError.message);
          }
          nextReport.imported.push(draft.name.trim());
        } catch (error: any) {
          nextReport.failed.push(`${template.name}: ${error?.message || 'Could not save product'}`);
        }
      }
      setReport(nextReport);
      if (nextReport.imported.length) {
        await refreshStoreData();
        showToast(`${nextReport.imported.length} product(s) imported successfully`, 'success');
      }
      if (nextReport.failed.length) setImportError('Some products could not be imported. Your successful imports are saved; review the errors below and retry only failed items.');
      if (!nextReport.failed.length) {
        setSelected((prev) => {
          const next = { ...prev };
          [...nextReport.imported, ...nextReport.skipped].forEach((name) => { delete next[name]; });
          return next;
        });
        setReviewOpen(false);
      }
    } finally {
      setImporting(false);
    }
  };

  if (!currentStore) return <div className="p-8 text-center text-slate-500">Choose a store to import products.</div>;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onBack} aria-label="Back to Product Management" className="mt-1 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Templates</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Add products to {currentStore.name} in minutes. Browse ready-made templates, select the items you sell, customize their details, and import them directly into your inventory.</p>
        </div>
      </div>

      {!canCreate && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle className="h-5 w-5 shrink-0" />You can browse templates, but your role does not have permission to create products.</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PRODUCT_TEMPLATE_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const count = category.products.length;
          return <button type="button" key={category.name} onClick={() => { setActiveCategory(category.name); setQuery(''); }} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${activeCategory === category.name && !query ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.color}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block text-xs font-bold leading-4 text-slate-800 sm:text-sm">{category.name}</span><span className="mt-1 block text-[11px] text-slate-500">{count} products</span></span>
          </button>;
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-900">{query ? 'Search results' : activeCategory}</h2><p className="mt-1 text-xs text-slate-500">{visible.length} products available · choose the ones you sell</p></div>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:w-80"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="Search product templates" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all templates..." className="min-w-0 flex-1 text-sm outline-none" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4 text-slate-400" /></button>}</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <button type="button" onClick={toggleVisible} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-white">{visible.length && visible.every((item) => selected[item.name]) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}Select all {query ? 'results' : 'in category'}</button>
          <span className="text-sm font-semibold text-blue-700">{selectedTemplates.length} selected</span>
          <button type="button" onClick={() => setSelected({})} disabled={!selectedTemplates.length} className="min-h-10 rounded-lg px-2 text-sm text-slate-500 hover:bg-white disabled:opacity-40">Clear selection</button>
        </div>
        <div className="divide-y divide-slate-100">
          {visible.map((item) => {
            const checked = Boolean(selected[item.name]);
            const duplicate = alreadyExists(item);
            return <label key={item.name} className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${checked ? 'bg-blue-50/60' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(item.name)} className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Package className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.name}</span><span className="mt-0.5 block text-xs text-slate-500">{item.subcategory} · {item.unit}</span></span>
              {duplicate && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Already in store</span>}
              {checked && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
            </label>;
          })}
          {!visible.length && <div className="px-5 py-14 text-center"><Package className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No products found</p><p className="mt-1 text-sm text-slate-500">Try another search or add your product manually.</p><button type="button" onClick={onBack} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add product manually</button></div>}
        </div>
      </section>

      <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><p className="text-sm font-bold text-slate-900">{selectedTemplates.length} product{selectedTemplates.length === 1 ? '' : 's'} selected</p><p className="text-xs text-slate-500">Prices and stock are set by you during review.</p></div>
        <button type="button" disabled={!selectedTemplates.length || !canCreate} onClick={openReview} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><Import className="h-4 w-4" />Import Selected Products</button>
      </div>

      {report && <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <h3 className="font-bold text-slate-900">Last import summary</h3>
        <div className="mt-2 flex flex-wrap gap-2"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{report.imported.length} imported</span><span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{report.skipped.length} skipped as duplicates</span><span className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{report.failed.length} failed</span></div>
        {!!report.skipped.length && <p className="mt-2 text-xs text-slate-600">Already present: {report.skipped.join(', ')}</p>}
        {!!report.failed.length && <ul className="mt-2 list-disc pl-5 text-xs text-red-700">{report.failed.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>}

      {reviewOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="template-review-title" className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
          <header className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-6"><div><h2 id="template-review-title" className="text-lg font-bold text-slate-900 sm:text-xl">Review imported products</h2><p className="mt-1 text-sm text-slate-500">Set your own prices and opening stock. Blank prices are saved as 0 and can be updated later.</p></div><button type="button" onClick={() => setReviewOpen(false)} disabled={importing} aria-label="Close review" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button></header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {selectedTemplates.map((item) => { const draft = drafts[item.name] || { name: item.name, category: item.category, cost: '', selling: '', stock: '0', minimum: '5', unit: item.unit, description: '' }; return <article key={item.name} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold text-slate-800">{item.name}</h3>{alreadyExists(item) && <span className="text-xs font-semibold text-amber-700">Will be skipped if unchanged</span>}</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-slate-600">Product name<input value={draft.name} onChange={(e) => updateDraft(item.name, 'name', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">Category<select value={draft.category} onChange={(e) => updateDraft(item.name, 'category', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900">{PRODUCT_TEMPLATE_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-600">Unit<input value={draft.unit} onChange={(e) => updateDraft(item.name, 'unit', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">Cost price<input type="number" min="0" step="0.01" value={draft.cost} onChange={(e) => updateDraft(item.name, 'cost', e.target.value)} placeholder="Enter your cost price" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">Selling price<input type="number" min="0" step="0.01" value={draft.selling} onChange={(e) => updateDraft(item.name, 'selling', e.target.value)} placeholder="Enter your selling price" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">Initial stock<input type="number" min="0" step="any" value={draft.stock} onChange={(e) => updateDraft(item.name, 'stock', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">Low-stock threshold<input type="number" min="0" step="any" value={draft.minimum} onChange={(e) => updateDraft(item.name, 'minimum', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description (optional)<input value={draft.description} onChange={(e) => updateDraft(item.name, 'description', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
              </div>
            </article>; })}
            {importError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{importError}</div>}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-between sm:p-6"><button type="button" onClick={() => setReviewOpen(false)} disabled={importing} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Back to templates</button><button type="button" onClick={importSelected} disabled={importing || !selectedTemplates.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{importing ? <><Loader2 className="h-4 w-4 animate-spin" />Importing...</> : <><Import className="h-4 w-4" />Confirm & Import {selectedTemplates.length}</>}</button></footer>
        </section>
      </div>}
    </div>
  );
};
