import { defineStore } from 'pinia'
import { ref } from 'vue'

import { cancelSale, deleteSaleDraft, listSales, saveSaleAction } from '@/sales/repository'
import type { SaleDraft, SaleListItem, SaleSaveOptions, SaleSaveResult } from '@/sales/types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
}

export const useSaleStore = defineStore('sales', () => {
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const sales = ref<SaleListItem[]>([])

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      sales.value = await listSales()
      loaded.value = true
    } catch (caught) {
      error.value = errorMessage(caught)
      throw caught
    } finally {
      loading.value = false
    }
  }

  async function saveAction(
    draft: SaleDraft,
    options: SaleSaveOptions = {},
  ): Promise<SaleSaveResult> {
    const result = await saveSaleAction(draft, options)
    await load(true)
    return result
  }

  async function cancelAction(id: string): Promise<void> {
    await cancelSale(id)
    await load(true)
  }

  async function deleteDraftAction(id: string): Promise<void> {
    await deleteSaleDraft(id)
    await load(true)
  }

  return { loading, loaded, error, sales, load, saveAction, cancelAction, deleteDraftAction }
})
