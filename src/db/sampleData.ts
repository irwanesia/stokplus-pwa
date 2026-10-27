import { db } from './dexie'
import type {
  Customer,
  ExpenseCategory,
  Product,
  ProductCategory,
  ProductUnit,
  Supplier,
  Unit,
} from './schema'
import { nowIso } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

export interface SampleDataCounts {
  units: number
  productCategories: number
  products: number
  productUnits: number
  suppliers: number
  customers: number
  expenseCategories: number
}

export async function seedSampleData(): Promise<SampleDataCounts> {
  const sampleFlag = await db.settings.get('sample_data_seeded')
  if (sampleFlag?.value === true) {
    throw new Error('Data contoh sudah pernah diisi.')
  }

  const existing = await Promise.all([
    db.units.count(),
    db.product_categories.count(),
    db.products.count(),
    db.product_units.count(),
    db.suppliers.count(),
    db.customers.count(),
    db.expense_categories.count(),
  ])

  if (existing.some((count) => count > 0)) {
    throw new Error('Data master sudah berisi. Kosongkan data terlebih dahulu.')
  }

  const now = nowIso()
  const unitPcs = uuidv7()
  const unitGram = uuidv7()
  const unitPack = uuidv7()
  const unitKg = uuidv7()
  const unitDus = uuidv7()
  const categoryFrozen = uuidv7()
  const categoryBahan = uuidv7()
  const productSiomay = uuidv7()
  const productAyam = uuidv7()
  const productNugget = uuidv7()

  const units: Unit[] = [
    {
      id: unitPcs,
      nama: 'Pcs',
      simbol: 'pcs',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: unitGram,
      nama: 'Gram',
      simbol: 'g',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: unitPack,
      nama: 'Pack',
      simbol: 'pack',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: unitKg,
      nama: 'Kilogram',
      simbol: 'kg',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: unitDus,
      nama: 'Dus',
      simbol: 'dus',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  const categories: ProductCategory[] = [
    {
      id: categoryFrozen,
      kode: 'FRZ',
      nama: 'Frozen Food',
      deskripsi: 'Produk beku siap jual.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: categoryBahan,
      kode: 'BHN',
      nama: 'Bahan Pendamping',
      deskripsi: 'Bahan pelengkap dan saus.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  const products: Product[] = [
    {
      id: productSiomay,
      kode: 'SIO-001',
      nama: 'Siomay Ayam',
      kategori_id: categoryFrozen,
      base_unit_id: unitPcs,
      track_expiry: true,
      expiry_alert_days: null,
      min_stock_base: 20,
      stock_base: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: productAyam,
      kode: 'AYM-001',
      nama: 'Ayam Fillet',
      kategori_id: categoryFrozen,
      base_unit_id: unitGram,
      track_expiry: true,
      expiry_alert_days: null,
      min_stock_base: 5000,
      stock_base: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: productNugget,
      kode: 'NUG-001',
      nama: 'Nugget Ayam',
      kategori_id: categoryFrozen,
      base_unit_id: unitPcs,
      track_expiry: true,
      expiry_alert_days: null,
      min_stock_base: 20,
      stock_base: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  const productUnits: ProductUnit[] = [
    {
      id: uuidv7(),
      product_id: productSiomay,
      unit_id: unitPcs,
      conversion_qty: 1,
      is_base: true,
      can_purchase: false,
      can_sell: true,
      is_default_purchase: false,
      is_default_sale: true,
      harga_beli_default: 0,
      harga_jual: 2500,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productSiomay,
      unit_id: unitPack,
      conversion_qty: 10,
      is_base: false,
      can_purchase: true,
      can_sell: true,
      is_default_purchase: true,
      is_default_sale: false,
      harga_beli_default: 20000,
      harga_jual: 24000,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productSiomay,
      unit_id: unitDus,
      conversion_qty: 100,
      is_base: false,
      can_purchase: true,
      can_sell: false,
      is_default_purchase: false,
      is_default_sale: false,
      harga_beli_default: 150000,
      harga_jual: 0,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productAyam,
      unit_id: unitGram,
      conversion_qty: 1,
      is_base: true,
      can_purchase: false,
      can_sell: false,
      is_default_purchase: false,
      is_default_sale: false,
      harga_beli_default: 0,
      harga_jual: 0,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productAyam,
      unit_id: unitKg,
      conversion_qty: 1000,
      is_base: false,
      can_purchase: true,
      can_sell: false,
      is_default_purchase: true,
      is_default_sale: false,
      harga_beli_default: 95000,
      harga_jual: 0,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productAyam,
      unit_id: unitPack,
      conversion_qty: 500,
      is_base: false,
      can_purchase: false,
      can_sell: true,
      is_default_purchase: false,
      is_default_sale: true,
      harga_beli_default: 0,
      harga_jual: 60000,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productNugget,
      unit_id: unitPcs,
      conversion_qty: 1,
      is_base: true,
      can_purchase: false,
      can_sell: true,
      is_default_purchase: false,
      is_default_sale: true,
      harga_beli_default: 0,
      harga_jual: 1200,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv7(),
      product_id: productNugget,
      unit_id: unitPack,
      conversion_qty: 20,
      is_base: false,
      can_purchase: true,
      can_sell: true,
      is_default_purchase: true,
      is_default_sale: false,
      harga_beli_default: 18000,
      harga_jual: 22000,
      barcode: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ]

  const suppliers: Supplier[] = [
    {
      id: uuidv7(),
      kode: 'SUP-001',
      nama: 'CV Frozen Nusantara',
      telepon: '0812-0000-0001',
      alamat: 'Jl. Distribusi No. 1',
      catatan: 'Supplier utama frozen food.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv7(),
      kode: 'SUP-002',
      nama: 'Toko Bahan Segar',
      telepon: '0812-0000-0002',
      alamat: 'Jl. Pasar Baru No. 8',
      catatan: '',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  const customers: Customer[] = [
    {
      id: uuidv7(),
      kode: 'CUST-001',
      nama: 'Warung Bu Sari',
      telepon: '0813-0000-0001',
      alamat: 'Jl. Melati No. 12',
      catatan: 'Pelanggan langganan.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv7(),
      kode: 'CUST-UMUM',
      nama: 'Pelanggan Umum',
      telepon: '',
      alamat: '',
      catatan: 'Penjualan tanpa identitas pelanggan.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  const expenseCategories: ExpenseCategory[] = [
    {
      id: uuidv7(),
      kode: 'ELK',
      nama: 'Listrik & Air',
      deskripsi: 'Listrik, air, dan freezer.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv7(),
      kode: 'SEWA',
      nama: 'Sewa Tempat',
      deskripsi: 'Sewa tempat usaha.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv7(),
      kode: 'OPS',
      nama: 'Operasional',
      deskripsi: 'Kebutuhan operasional harian.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: uuidv7(),
      kode: 'GAJI',
      nama: 'Gaji',
      deskripsi: 'Gaji karyawan.',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ]

  await db.transaction(
    'rw',
    [
      db.units,
      db.product_categories,
      db.products,
      db.product_units,
      db.suppliers,
      db.customers,
      db.expense_categories,
      db.settings,
    ],
    async () => {
      await db.units.bulkAdd(units)
      await db.product_categories.bulkAdd(categories)
      await db.products.bulkAdd(products)
      await db.product_units.bulkAdd(productUnits)
      await db.suppliers.bulkAdd(suppliers)
      await db.customers.bulkAdd(customers)
      await db.expense_categories.bulkAdd(expenseCategories)
      await db.settings.put({
        key: 'sample_data_seeded',
        value: true,
        updated_at: now,
      })
    },
  )

  return {
    units: units.length,
    productCategories: categories.length,
    products: products.length,
    productUnits: productUnits.length,
    suppliers: suppliers.length,
    customers: customers.length,
    expenseCategories: expenseCategories.length,
  }
}
