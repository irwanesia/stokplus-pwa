import type {
  Product,
  StockLot,
  StockMovement,
  StockOpname,
  StockOpnameItem,
  StockWriteoff,
  StockWriteoffItem,
} from '@/db/schema'

export interface StockLotRow extends StockLot {
  productName: string
  productCode: string
  baseUnitSymbol: string
  remainingValue: number
  daysToExpiry: number | null
}

export interface StockProductRow {
  product: Product
  baseUnitSymbol: string
  displayStock: { qty: number; unitSymbol: string } | null
  lots: StockLotRow[]
  lotStock: number
  stockDifference: number
  inventoryValue: number
}

export interface WriteoffItemDraft {
  lot_id: string
  qty_base: number
  keterangan: string
}

export interface WriteoffDraft {
  tanggal: string
  alasan: StockWriteoff['alasan']
  keterangan: string
  items: WriteoffItemDraft[]
}

export interface WriteoffListRow extends StockWriteoff {
  itemCount: number
}

export interface WriteoffDetail extends StockWriteoff {
  items: Array<StockWriteoffItem & { productName: string; lotCode: string; baseUnitSymbol: string }>
}

export interface StocktakeItemDraft {
  product_id: string
  physical_qty_base: number
  expiry_date: string
}

export interface StocktakeDraft {
  tanggal: string
  keterangan: string
  items: StocktakeItemDraft[]
}

export interface StocktakeListRow extends StockOpname {
  itemCount: number
  totalDifference: number
}

export interface StocktakeDetail extends StockOpname {
  items: Array<
    StockOpnameItem & {
      productName: string
      baseUnitSymbol: string
      expiry_date: string
    }
  >
}

export interface StockLedger {
  product: Product
  baseUnitSymbol: string
  lots: StockLotRow[]
  movements: StockMovement[]
}

export type InventoryProduct = StockProductRow['product']
