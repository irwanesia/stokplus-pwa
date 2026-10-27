import Dexie, { type Table } from 'dexie'

import { migrateToV2 } from './migrations'
import {
  ALL_STORES,
  SCHEMA_VERSION,
  type AuditLog,
  type BusinessProfile,
  type Customer,
  type Expense,
  type ExpenseCategory,
  type MetaRecord,
  type Product,
  type ProductCategory,
  type ProductUnit,
  type Purchase,
  type PurchaseItem,
  type Sale,
  type SaleItem,
  type SaleLotConsumption,
  type SettingRecord,
  type StockLot,
  type StockMovement,
  type StockOpname,
  type StockOpnameItem,
  type StockWriteoff,
  type StockWriteoffItem,
  type Supplier,
  type Unit,
} from './schema'

export const DB_NAME = 'stokplus'
export { SCHEMA_VERSION }

export class StokPlusDatabase extends Dexie {
  app_meta!: Table<MetaRecord, string>
  business_profile!: Table<BusinessProfile, string>
  settings!: Table<SettingRecord, string>
  product_categories!: Table<ProductCategory, string>
  units!: Table<Unit, string>
  products!: Table<Product, string>
  product_units!: Table<ProductUnit, string>
  suppliers!: Table<Supplier, string>
  customers!: Table<Customer, string>
  expense_categories!: Table<ExpenseCategory, string>
  purchases!: Table<Purchase, string>
  purchase_items!: Table<PurchaseItem, string>
  sales!: Table<Sale, string>
  sale_items!: Table<SaleItem, string>
  sale_lot_consumptions!: Table<SaleLotConsumption, string>
  stock_lots!: Table<StockLot, string>
  stock_movements!: Table<StockMovement, string>
  stock_opnames!: Table<StockOpname, string>
  stock_opname_items!: Table<StockOpnameItem, string>
  stock_writeoffs!: Table<StockWriteoff, string>
  stock_writeoff_items!: Table<StockWriteoffItem, string>
  expenses!: Table<Expense, string>
  audit_logs!: Table<AuditLog, string>

  constructor(name = DB_NAME) {
    super(name)

    this.version(1).stores({
      app_meta: 'key',
    })

    this.version(SCHEMA_VERSION).stores(ALL_STORES).upgrade(migrateToV2)
  }
}

export const db = new StokPlusDatabase()
