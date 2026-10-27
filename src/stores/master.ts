import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type {
  Customer,
  ExpenseCategory,
  Product,
  ProductCategory,
  ProductUnit,
  Supplier,
  Unit,
} from '@/db/schema'
import {
  generateProductCode,
  getProductActivity,
  listCategories,
  listCustomers,
  listExpenseCategories,
  listMasterCounts,
  listProductUnits,
  listProducts,
  listSuppliers,
  listUnits,
  removeCategory,
  removeCustomer,
  removeExpenseCategory,
  removeProduct,
  removeSupplier,
  removeUnit,
  saveCategory,
  saveCustomer,
  saveExpenseCategory,
  saveProduct,
  saveSupplier,
  saveUnit,
  suggestPartnerCode,
  type ProductSaveResult,
} from '@/master/repository'
import type {
  ExpenseCategoryDraft,
  MasterCounts,
  PartnerDraft,
  ProductActivity,
  ProductCategoryDraft,
  ProductDraft,
  UnitDraft,
} from '@/master/types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
}

export const useMasterStore = defineStore('master', () => {
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const categories = ref<ProductCategory[]>([])
  const units = ref<Unit[]>([])
  const products = ref<Product[]>([])
  const productUnits = ref<ProductUnit[]>([])
  const suppliers = ref<Supplier[]>([])
  const customers = ref<Customer[]>([])
  const expenseCategories = ref<ExpenseCategory[]>([])
  const counts = ref<MasterCounts>({
    categories: 0,
    units: 0,
    products: 0,
    suppliers: 0,
    customers: 0,
    expenseCategories: 0,
  })

  const activeCategories = computed(() =>
    categories.value.filter((category) => category.status === 'active'),
  )
  const activeUnits = computed(() => units.value.filter((unit) => unit.status === 'active'))

  async function load(force = false) {
    if (loaded.value && !force) return

    loading.value = true
    error.value = ''

    try {
      const [
        nextCategories,
        nextUnits,
        nextProducts,
        nextProductUnits,
        nextSuppliers,
        nextCustomers,
        nextExpenseCategories,
        nextCounts,
      ] = await Promise.all([
        listCategories(),
        listUnits(),
        listProducts(),
        listProductUnits(),
        listSuppliers(),
        listCustomers(),
        listExpenseCategories(),
        listMasterCounts(),
      ])

      categories.value = nextCategories
      units.value = nextUnits
      products.value = nextProducts
      productUnits.value = nextProductUnits
      suppliers.value = nextSuppliers
      customers.value = nextCustomers
      expenseCategories.value = nextExpenseCategories
      counts.value = nextCounts
      loaded.value = true
    } catch (caught) {
      error.value = errorMessage(caught)
      throw caught
    } finally {
      loading.value = false
    }
  }

  function unitsForProduct(productId: string): ProductUnit[] {
    return productUnits.value
      .filter((row) => row.product_id === productId)
      .sort((a, b) => {
        if (a.is_base !== b.is_base) return a.is_base ? -1 : 1
        return b.conversion_qty - a.conversion_qty
      })
  }

  function categoryName(id: string): string {
    return categories.value.find((category) => category.id === id)?.nama ?? 'Tanpa kategori'
  }

  function unitName(id: string): string {
    return units.value.find((unit) => unit.id === id)?.nama ?? 'Satuan'
  }

  function unitSymbol(id: string): string {
    const unit = units.value.find((row) => row.id === id)
    return unit?.simbol || unit?.nama || 'satuan'
  }

  async function saveCategoryAction(
    input: ProductCategoryDraft,
    id?: string,
  ): Promise<ProductCategory> {
    const result = await saveCategory(input, id)
    await load(true)
    return result
  }

  async function saveUnitAction(input: UnitDraft, id?: string): Promise<Unit> {
    const result = await saveUnit(input, id)
    await load(true)
    return result
  }

  async function saveSupplierAction(input: PartnerDraft, id?: string): Promise<Supplier> {
    const result = await saveSupplier(input, id)
    await load(true)
    return result
  }

  async function saveCustomerAction(input: PartnerDraft, id?: string): Promise<Customer> {
    const result = await saveCustomer(input, id)
    await load(true)
    return result
  }

  async function saveExpenseCategoryAction(
    input: ExpenseCategoryDraft,
    id?: string,
  ): Promise<ExpenseCategory> {
    const result = await saveExpenseCategory(input, id)
    await load(true)
    return result
  }

  async function saveProductAction(input: ProductDraft, id?: string): Promise<ProductSaveResult> {
    const result = await saveProduct(input, id)
    await load(true)
    return result
  }

  async function removeCategoryAction(id: string) {
    const mode = await removeCategory(id)
    await load(true)
    return mode
  }

  async function removeUnitAction(id: string) {
    const mode = await removeUnit(id)
    await load(true)
    return mode
  }

  async function removeSupplierAction(id: string) {
    const mode = await removeSupplier(id)
    await load(true)
    return mode
  }

  async function removeCustomerAction(id: string) {
    const mode = await removeCustomer(id)
    await load(true)
    return mode
  }

  async function removeExpenseCategoryAction(id: string) {
    const mode = await removeExpenseCategory(id)
    await load(true)
    return mode
  }

  async function removeProductAction(id: string) {
    const mode = await removeProduct(id)
    await load(true)
    return mode
  }

  async function nextProductCode(categoryId: string): Promise<string> {
    return generateProductCode(categoryId)
  }

  async function nextPartnerCode(
    table: 'suppliers' | 'customers' | 'expense_categories',
  ): Promise<string> {
    return suggestPartnerCode(table)
  }

  async function productActivity(productId: string): Promise<ProductActivity> {
    return getProductActivity(productId)
  }

  return {
    loading,
    loaded,
    error,
    categories,
    units,
    products,
    productUnits,
    suppliers,
    customers,
    expenseCategories,
    counts,
    activeCategories,
    activeUnits,
    load,
    unitsForProduct,
    categoryName,
    unitName,
    unitSymbol,
    saveCategoryAction,
    saveUnitAction,
    saveSupplierAction,
    saveCustomerAction,
    saveExpenseCategoryAction,
    saveProductAction,
    removeCategoryAction,
    removeUnitAction,
    removeSupplierAction,
    removeCustomerAction,
    removeExpenseCategoryAction,
    removeProductAction,
    nextProductCode,
    nextPartnerCode,
    productActivity,
  }
})
