import { describe, expect, it } from 'vitest'

import {
  allocatePurchaseCosts,
  computePurchaseTotals,
  validateExpiryForProduct,
  validatePurchaseHeader,
  validatePurchaseItem,
} from '@/purchases/validation'

describe('purchase validation', () => {
  it('allocates header discount and freight proportionally', () => {
    const result = allocatePurchaseCosts(
      [
        { subtotal: 100_000, qty_base: 100 },
        { subtotal: 200_000, qty_base: 200 },
      ],
      30_000,
      6_000,
    )

    expect(result.totals).toEqual({
      subtotal: 300_000,
      diskon: 30_000,
      biaya_angkut: 6_000,
      total: 276_000,
    })
    expect(result.lines[0]).toMatchObject({
      diskon_header: 10_000,
      biaya_angkut: 2_000,
      total_lot: 92_000,
      unit_cost_base: 920,
    })
    expect(result.lines[1]).toMatchObject({
      diskon_header: 20_000,
      biaya_angkut: 4_000,
      total_lot: 184_000,
      unit_cost_base: 920,
    })
  })

  it('keeps four decimal unit cost precision', () => {
    const result = allocatePurchaseCosts([{ subtotal: 100_000, qty_base: 3 }], 0, 0)
    expect(result.lines[0]?.unit_cost_base).toBe(33_333.3333)
  })

  it('rejects invalid header totals', () => {
    expect(
      validatePurchaseHeader(
        {
          tanggal: '2026-10-25',
          supplier_id: 'supplier',
          metode_pembayaran: 'tunai',
          diskon: 30_000,
          biaya_angkut: 0,
          bayar: 0,
        },
        { subtotal: 20_000 },
      ),
    ).toBe('Diskon header tidak boleh melebihi subtotal.')

    expect(
      validatePurchaseHeader(
        {
          tanggal: '2026-10-25',
          supplier_id: 'supplier',
          metode_pembayaran: 'tunai',
          diskon: 0,
          biaya_angkut: 0,
          bayar: 19_000,
        },
        { subtotal: 20_000, complete: true },
      ),
    ).toBe('Jumlah bayar kurang dari total pembelian.')
  })

  it('validates item qty, discount, and expiry', () => {
    expect(validatePurchaseItem({ qty_unit: 0.25, harga_beli_unit: 20_000, diskon: 0 })).toBeNull()
    expect(validatePurchaseItem({ qty_unit: 0.0015, harga_beli_unit: 20_000, diskon: 0 })).toBe(
      'Qty maksimal 3 angka desimal.',
    )
    expect(validatePurchaseItem({ qty_unit: 1, harga_beli_unit: 20_000, diskon: 25_000 })).toBe(
      'Diskon item tidak boleh melebihi nilai qty × harga.',
    )
    expect(validateExpiryForProduct(true, '')).toBe(
      'Expiry wajib diisi untuk produk yang memakai tracking expiry.',
    )
    expect(validateExpiryForProduct(false, '')).toBeNull()
  })

  it('computes purchase totals', () => {
    expect(
      computePurchaseTotals([{ subtotal: 50_000 }, { subtotal: 75_000 }], 5_000, 2_500),
    ).toEqual({
      subtotal: 125_000,
      diskon: 5_000,
      biaya_angkut: 2_500,
      total: 122_500,
    })
  })
})
