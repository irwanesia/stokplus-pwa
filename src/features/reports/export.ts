import type * as XLSX from '@e965/xlsx'

import type { BusinessProfile } from '@/db/schema'
import { formatDateId } from '@/utils/date'

import type { ReportKind, ReportsData } from './repository'

type CellValue = string | number | boolean | null
type SheetJs = typeof import('@e965/xlsx')

function loadSheetJs(): Promise<SheetJs> {
  return import('@e965/xlsx')
}

const reportNames: Record<ReportKind, string> = {
  sales: 'penjualan',
  purchases: 'pembelian',
  stock: 'stok',
  expenses: 'beban',
  expiry: 'expiry',
  'profit-loss': 'laba-rugi',
}

export async function createReportWorkbook(
  data: ReportsData,
  kind: ReportKind,
  profile: Pick<BusinessProfile, 'nama_usaha'> | null,
): Promise<XLSX.WorkBook> {
  const XLSX = await loadSheetJs()
  function addSheet(
    workbook: XLSX.WorkBook,
    name: string,
    businessName: string,
    data: ReportsData,
    headers: string[],
    rows: CellValue[][],
    summary?: Array<[string, CellValue]>,
  ): void {
    const values: CellValue[][] = [
      ['StokPlus'],
      [businessName || 'StokPlus'],
      ['Periode', formatDateId(data.range.startDate), 'sampai', formatDateId(data.range.endDate)],
    ]
    if (data.estimatedHpp) {
      values.push([
        'Catatan',
        'Periode mencakup tanggal sebelum cutover; HPP dapat bersifat estimasi.',
      ])
    }
    values.push([], headers, ...rows)
    if (summary?.length) values.push([], ...summary.map(([label, value]) => [label, value]))
    const worksheet = XLSX.utils.aoa_to_sheet(values)
    worksheet['!cols'] = headers.map((header) => ({
      wch: Math.max(14, Math.min(32, header.length + 5)),
    }))
    const headerRow = data.estimatedHpp ? 6 : 5
    worksheet['!autofilter'] = {
      ref: `A${headerRow}:${XLSX.utils.encode_col(headers.length - 1)}${headerRow + rows.length}`,
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  }

  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: `Laporan ${reportNames[kind]}`,
    Author: 'StokPlus',
    Subject: `Periode ${data.range.startDate} sampai ${data.range.endDate}`,
  }
  const businessName = profile?.nama_usaha ?? 'StokPlus'

  if (kind === 'sales') {
    addSheet(
      workbook,
      'Penjualan',
      businessName,
      data,
      [
        'Tanggal',
        'No. transaksi',
        'Pelanggan',
        'Penjualan kotor',
        'Diskon',
        'Penjualan bersih',
        'HPP / COGS',
        'Laba kotor',
        'HPP estimasi',
      ],
      data.sales.rows.map((row) => [
        row.date,
        row.number,
        row.customer,
        row.gross,
        row.discount,
        row.revenue,
        row.cogs,
        row.grossProfit,
        row.estimatedHpp ? 'Ya' : 'Tidak',
      ]),
      [
        ['Total penjualan kotor', data.sales.gross],
        ['Total diskon', data.sales.discount],
        ['Penjualan bersih', data.sales.revenue],
        ['Total HPP / COGS', data.sales.cogs],
        ['Laba kotor', data.sales.grossProfit],
        ['Margin kotor (%)', data.sales.grossMargin],
        ['Jumlah transaksi', data.sales.count],
      ],
    )
  } else if (kind === 'purchases') {
    addSheet(
      workbook,
      'Pembelian',
      businessName,
      data,
      [
        'Tanggal',
        'No. transaksi',
        'Supplier',
        'Pembelian kotor',
        'Diskon',
        'Biaya angkut',
        'Pembelian bersih',
      ],
      data.purchases.rows.map((row) => [
        row.date,
        row.number,
        row.supplier,
        row.gross,
        row.discount,
        row.freight,
        row.net,
      ]),
      [
        ['Total pembelian kotor', data.purchases.gross],
        ['Total diskon', data.purchases.discount],
        ['Total biaya angkut', data.purchases.freight],
        ['Pembelian bersih', data.purchases.net],
        ['Jumlah transaksi', data.purchases.count],
      ],
    )
  } else if (kind === 'stock') {
    addSheet(
      workbook,
      'Ringkasan Stok',
      businessName,
      data,
      ['Kode produk', 'Produk', 'Stok base', 'Satuan base', 'Nilai persediaan', 'Jumlah lot'],
      data.stock.products.map((row) => [
        row.product.kode,
        row.product.nama,
        row.lotStock,
        row.baseUnitSymbol,
        row.inventoryValue,
        row.lots.length,
      ]),
      [
        ['Jumlah produk', data.stock.totalProducts],
        ['Total qty base (satuan campuran)', data.stock.totalBaseQuantity],
        ['Nilai persediaan', data.stock.inventoryValue],
        ['Produk menipis', data.stock.lowStockCount],
        ['Produk habis', data.stock.outOfStockCount],
        ['Lot expired', data.stock.expiredLotCount],
        ['Lot hampir expired', data.stock.nearExpiryLotCount],
      ],
    )
    addSheet(
      workbook,
      'Mutasi',
      businessName,
      data,
      [
        'Tanggal',
        'Kode produk',
        'Produk',
        'Tipe',
        'Qty base',
        'Satuan',
        'Saldo sebelum',
        'Saldo sesudah',
        'Referensi',
      ],
      data.stock.movements.map((row) => [
        row.tanggal,
        row.productCode,
        row.productName,
        row.tipe,
        row.qty_base,
        row.baseUnitSymbol,
        row.stock_before_base,
        row.stock_after_base,
        `${row.ref_type} ${row.ref_id}`,
      ]),
    )
    addSheet(
      workbook,
      'Lot',
      businessName,
      data,
      [
        'Kode produk',
        'Produk',
        'Kode lot',
        'Expiry',
        'Qty tersisa',
        'Satuan base',
        'Nilai tersisa',
        'Status',
      ],
      data.stock.products.flatMap((row) =>
        row.lots.map((lot) => [
          row.product.kode,
          row.product.nama,
          lot.lot_code,
          lot.expiry_date,
          lot.qty_remaining_base,
          row.baseUnitSymbol,
          lot.remainingValue,
          lot.status,
        ]),
      ),
    )
  } else if (kind === 'expenses') {
    addSheet(
      workbook,
      'Beban',
      businessName,
      data,
      ['Tanggal', 'No. transaksi', 'Kategori', 'Keterangan', 'Nominal'],
      data.expenses.rows.map((row) => [
        row.date,
        row.number,
        row.category,
        row.description,
        row.amount,
      ]),
      [
        ['Total beban', data.expenses.total],
        ['Jumlah transaksi', data.expenses.count],
      ],
    )
    addSheet(
      workbook,
      'Ringkasan Kategori',
      businessName,
      data,
      ['Kategori', 'Jumlah transaksi', 'Total'],
      data.expenses.items.map((item) => [item.categoryName, item.count, item.total]),
    )
  } else if (kind === 'expiry') {
    addSheet(
      workbook,
      'Lot Expiry',
      businessName,
      data,
      [
        'Kode produk',
        'Produk',
        'Kode lot',
        'Expiry',
        'Sisa hari',
        'Qty tersisa',
        'Nilai tersisa',
        'Status',
      ],
      data.expiry.lots.map((lot) => [
        lot.productCode,
        lot.productName,
        lot.lot_code,
        lot.expiry_date,
        lot.daysToExpiry,
        lot.qty_remaining_base,
        lot.remainingValue,
        lot.status,
      ]),
      [
        ['Lot expired', data.expiry.expiredCount],
        ['Lot hampir expired', data.expiry.nearExpiryCount],
        ['Lot karantina', data.expiry.quarantineCount],
        ['Nilai stok berisiko', data.expiry.riskValue],
      ],
    )
    addSheet(
      workbook,
      'Riwayat Write-off',
      businessName,
      data,
      ['Tanggal', 'No. write-off', 'Alasan', 'Total kerugian'],
      data.expiry.writeoffs.map((row) => [row.date, row.number, row.reason, row.totalCost]),
      [['Total write-off', data.expiry.writeoffs.reduce((sum, row) => sum + row.totalCost, 0)]],
    )
  } else {
    addSheet(
      workbook,
      'Laba Rugi',
      businessName,
      data,
      ['Komponen', 'Nilai'],
      [
        ['Penjualan kotor', data.sales.gross],
        ['Diskon penjualan', -data.sales.discount],
        ['Penjualan bersih', data.profitLoss.revenue],
        ['HPP / COGS', -data.profitLoss.cogs],
        ['Laba kotor', data.profitLoss.grossProfit],
        ['Kerugian persediaan', -data.profitLoss.inventoryLoss],
        ['Beban operasional', -data.profitLoss.operatingExpenses],
        ['Laba bersih', data.profitLoss.netProfit],
      ],
      [
        ['Jumlah penjualan selesai', data.profitLoss.completedSaleCount],
        ['Jumlah beban selesai', data.profitLoss.completedExpenseCount],
      ],
    )
  }

  return workbook
}

export async function exportReport(
  data: ReportsData,
  kind: ReportKind,
  profile: Pick<BusinessProfile, 'nama_usaha'> | null,
): Promise<string> {
  const filename = `laporan-${reportNames[kind]}-${data.range.startDate}-${data.range.endDate}.xlsx`
  const workbook = await createReportWorkbook(data, kind, profile)
  const XLSX = await loadSheetJs()
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const file = new File([output], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: filename })
  } else {
    const blob = new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
  return filename
}
