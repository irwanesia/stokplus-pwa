import { defineStore } from 'pinia'
import { ref } from 'vue'

import { cancelExpense, deleteExpenseDraft, listExpenses, saveExpense } from '@/expenses/repository'
import type {
  ExpenseDraft,
  ExpenseListItem,
  ExpenseSaveOptions,
  ExpenseSaveResult,
} from '@/expenses/types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
}

export const useExpenseStore = defineStore('expenses', () => {
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const expenses = ref<ExpenseListItem[]>([])

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      expenses.value = await listExpenses()
      loaded.value = true
    } catch (caught) {
      error.value = errorMessage(caught)
      throw caught
    } finally {
      loading.value = false
    }
  }

  async function saveAction(
    draft: ExpenseDraft,
    options: ExpenseSaveOptions = {},
  ): Promise<ExpenseSaveResult> {
    const result = await saveExpense(draft, options)
    await load(true)
    return result
  }

  async function cancelAction(id: string): Promise<void> {
    await cancelExpense(id)
    await load(true)
  }

  async function deleteDraftAction(id: string): Promise<void> {
    await deleteExpenseDraft(id)
    await load(true)
  }

  return { loading, loaded, error, expenses, load, saveAction, cancelAction, deleteDraftAction }
})
