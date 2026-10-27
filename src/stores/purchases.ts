import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  cancelPurchase,
  deletePurchaseDraft,
  listPurchases,
  savePurchase,
} from '@/purchases/repository'
import type {
  PurchaseDraft,
  PurchaseListItem,
  PurchaseSaveOptions,
  PurchaseSaveResult,
} from '@/purchases/types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
}

export const usePurchaseStore = defineStore('purchases', () => {
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const purchases = ref<PurchaseListItem[]>([])

  async function load(force = false) {
    if (loaded.value && !force) return

    loading.value = true
    error.value = ''

    try {
      purchases.value = await listPurchases()
      loaded.value = true
    } catch (caught) {
      error.value = errorMessage(caught)
      throw caught
    } finally {
      loading.value = false
    }
  }

  async function saveAction(
    draft: PurchaseDraft,
    options: PurchaseSaveOptions = {},
  ): Promise<PurchaseSaveResult> {
    const result = await savePurchase(draft, options)
    await load(true)
    return result
  }

  async function cancelAction(id: string): Promise<void> {
    await cancelPurchase(id)
    await load(true)
  }

  async function deleteDraftAction(id: string): Promise<void> {
    await deletePurchaseDraft(id)
    await load(true)
  }

  return {
    loading,
    loaded,
    error,
    purchases,
    load,
    saveAction,
    cancelAction,
    deleteDraftAction,
  }
})
