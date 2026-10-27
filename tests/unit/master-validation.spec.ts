import { describe, expect, it } from 'vitest'

import type { ProductUnitDraft } from '@/master/types'
import {
  nextCode,
  toBaseQuantity,
  unitRowError,
  validateCode,
  validateInteger,
  validateProductUnits,
} from '@/master/validation'

function row(overrides: Partial<ProductUnitDraft> = {}): ProductUnitDraft {
  return {
    unit_id: 'pcs',
    conversion_qty: 1,
    is_base: true,
    can_purchase: false,
    can_sell: true,
    is_default_purchase: false,
    is_default_sale: true,
    harga_beli_default: 0,
    harga_jual: 2500,
    barcode: '',
    status: 'active',
    ...overrides,
  }
}

describe('master data validation', () => {
  it('converts unit quantities to integer base quantities', () => {
    expect(toBaseQuantity(1, 100)).toBe(100)
    expect(toBaseQuantity(0.5, 1000)).toBe(500)
    expect(toBaseQuantity(3, 10)).toBe(30)
    expect(toBaseQuantity(1, 0)).toBeNull()
    expect(toBaseQuantity(0.5, 3)).toBeNull()
    expect(validateInteger(0.5, 'Konversi', { min: 1 })).toContain('bilangan bulat')
  })

  it('validates the base row and default buy/sell flags', () => {
    expect(validateProductUnits([row()], 'pcs')).toBeNull()

    expect(
      validateProductUnits(
        [
          row({
            unit_id: 'pack',
            conversion_qty: 10,
            is_base: false,
            can_sell: true,
            is_default_sale: true,
          }),
        ],
        'pcs',
      ),
    ).toContain('tepat satu baris base unit')

    expect(
      validateProductUnits(
        [
          row({
            can_purchase: true,
            is_default_purchase: true,
          }),
          row({
            unit_id: 'pack',
            conversion_qty: 10,
            is_base: false,
            can_purchase: true,
            is_default_purchase: true,
            can_sell: false,
            is_default_sale: false,
          }),
        ],
        'pcs',
      ),
    ).toContain('satu default beli')
  })

  it('rejects fractional base results and zero conversion', () => {
    expect(
      unitRowError(
        row({
          unit_id: 'pack',
          conversion_qty: 0,
          is_base: false,
          can_sell: true,
          is_default_sale: true,
        }),
        'pcs',
      ),
    ).toContain('minimal 1')

    expect(toBaseQuantity(0.25, 2)).toBeNull()
  })

  it('validates codes and generates the next sequential code', () => {
    expect(validateCode('FRZ')).toBeNull()
    expect(validateCode('A')).not.toBeNull()
    expect(validateCode('fr z')).not.toBeNull()
    expect(nextCode('FRZ', ['FRZ-001', 'FRZ-003'])).toBe('FRZ-004')
    expect(nextCode('SUP', [])).toBe('SUP-001')
  })
})
