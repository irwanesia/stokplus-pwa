import { describe, expect, it } from 'vitest'

import {
  computeSaleTotals,
  saleLineSubtotal,
  validateSaleHeader,
  validateSaleItem,
} from '@/sales/validation'

describe('sale validation', () => {
  it('computes line and header discounts without a negative total', () => {
    expect(saleLineSubtotal(2, 12_000, 2_000)).toBe(22_000)
    expect(computeSaleTotals([{ subtotal: 22_000 }, { subtotal: 8_000 }], 5_000)).toEqual({
      subtotal: 30_000,
      diskon: 5_000,
      total: 25_000,
    })
  })

  it('validates item qty, price, and discounts', () => {
    expect(validateSaleItem({ qty_unit: 0.25, harga_jual_unit: 20_000, diskon: 0 })).toBeNull()
    expect(validateSaleItem({ qty_unit: 0.0015, harga_jual_unit: 20_000, diskon: 0 })).toBe(
      'Qty maksimal 3 angka desimal.',
    )
    expect(validateSaleItem({ qty_unit: 1, harga_jual_unit: -1, diskon: 0 })).toBe(
      'Harga jual minimal 0.',
    )
    expect(validateSaleItem({ qty_unit: 1, harga_jual_unit: 20_000, diskon: 25_000 })).toBe(
      'Diskon item tidak boleh melebihi nilai qty × harga.',
    )
  })

  it('requires sufficient payment and exact non-cash payment', () => {
    const header = {
      tanggal: '2026-10-25',
      metode_pembayaran: 'tunai' as const,
      diskon: 0,
      bayar: 19_000,
    }
    expect(validateSaleHeader(header, { subtotal: 20_000, complete: true })).toBe(
      'Jumlah bayar kurang dari total penjualan.',
    )
    expect(
      validateSaleHeader(
        { ...header, metode_pembayaran: 'qris', bayar: 21_000 },
        { subtotal: 20_000, complete: true },
      ),
    ).toBe('Pembayaran non-tunai harus sama dengan total penjualan.')
    expect(
      validateSaleHeader(
        { ...header, metode_pembayaran: 'transfer', bayar: 20_000 },
        { subtotal: 20_000, complete: true },
      ),
    ).toBeNull()
  })
})
