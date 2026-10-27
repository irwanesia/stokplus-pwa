<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Pencil, Trash2, WalletCards } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import { getExpense } from '@/expenses/repository'
import type { ExpenseListItem } from '@/expenses/types'
import { useExpenseStore } from '@/stores/expenses'
import { useUiStore } from '@/stores/ui'
import { formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const expenses = useExpenseStore()
const ui = useUiStore()
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const working = ref(false)
const confirmOpen = ref(false)
const expense = ref<ExpenseListItem | null>(null)
const paymentLabel = computed(
  () =>
    ({ tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', kredit: 'Kredit' })[
      expense.value?.metode_pembayaran ?? 'tunai'
    ],
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const id = typeof route.params.id === 'string' ? route.params.id : ''
    expense.value = await getExpense(id)
    if (!expense.value) loadError.value = 'Beban tidak ditemukan.'
  } catch (caught) {
    loadError.value = caught instanceof Error ? caught.message : 'Detail beban gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function confirmAction() {
  if (!expense.value) return
  working.value = true
  actionError.value = ''
  try {
    if (expense.value.status === 'draft') {
      const id = expense.value.id
      await expenses.deleteDraftAction(id)
      ui.notify('Draft beban dihapus.', 'success')
      await router.push('/transaksi/beban')
    } else {
      await expenses.cancelAction(expense.value.id)
      confirmOpen.value = false
      ui.notify('Beban dibatalkan dan tidak lagi dihitung di laporan.', 'success')
      await load()
    }
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'Aksi beban gagal dijalankan.'
  } finally {
    working.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Detail beban"
      :subtitle="expense?.nomor_transaksi ?? 'Memuat transaksi beban.'"
      back-to="/transaksi/beban"
    />

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>
    <AppCard v-else-if="loadError" title="Beban tidak dapat dibuka">
      <p class="text-sm leading-6 text-error">{{ loadError }}</p>
    </AppCard>
    <template v-else-if="expense">
      <section class="surface-card p-5" :class="expense.status === 'cancelled' ? 'opacity-80' : ''">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-semibold tracking-[0.16em] text-base-content/65 uppercase">
              {{ formatDateId(expense.tanggal) }}
            </p>
            <h2 class="mt-1 text-lg font-semibold tabular">{{ expense.nomor_transaksi }}</h2>
            <p class="mt-1 text-sm text-base-content/65">
              {{ expense.category?.nama ?? 'Kategori tidak ditemukan' }}
            </p>
          </div>
          <StatusChip :status="expense.status" size="md" />
        </div>
        <div class="mt-5 rounded-2xl bg-base-200/70 p-4">
          <p class="text-[10px] tracking-wide text-base-content/65 uppercase">Nominal beban</p>
          <p class="mt-1 text-2xl font-semibold tabular text-brand-navy">
            {{ formatRupiah(expense.nominal) }}
          </p>
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt class="text-base-content/65">Metode pembayaran</dt>
            <dd class="mt-1 font-semibold">{{ paymentLabel }}</dd>
          </div>
          <div class="text-right">
            <dt class="text-base-content/65">Klasifikasi</dt>
            <dd class="mt-1 font-semibold">Beban operasional</dd>
          </div>
        </dl>
        <p class="mt-4 rounded-xl bg-base-200/60 p-3 text-sm leading-6">
          {{ expense.keterangan }}
        </p>
        <div
          v-if="expense.status === 'draft'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-draft/20 bg-status-draft/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-draft" aria-hidden="true" />
          Draft belum dihitung dalam laba/rugi.
        </div>
        <div
          v-else-if="expense.status === 'cancelled'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-cancelled/20 bg-status-cancelled/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-cancelled" aria-hidden="true" />
          Beban dibatalkan dan tidak dihitung dalam laba/rugi.
        </div>
        <div
          v-else
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-completed/20 bg-status-completed/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          Beban selesai. Nominal masuk ke beban operasional tanpa mengubah HPP atau stok.
        </div>
      </section>

      <div v-if="expense.status === 'draft'" class="grid grid-cols-2 gap-3">
        <AppButton variant="danger" @click="confirmOpen = true">
          <Trash2 class="h-4 w-4" aria-hidden="true" />
          Hapus draft
        </AppButton>
        <RouterLink
          :to="`/transaksi/beban/${expense.id}/ubah`"
          class="btn btn-primary min-h-11 rounded-[var(--radius-control)] font-semibold normal-case"
        >
          <Pencil class="h-4 w-4" aria-hidden="true" />
          Ubah draft
        </RouterLink>
      </div>
      <AppButton
        v-else-if="expense.status === 'completed'"
        variant="danger"
        block
        @click="confirmOpen = true"
      >
        <WalletCards class="h-4 w-4" aria-hidden="true" />
        Batalkan beban
      </AppButton>
    </template>

    <AppBottomSheet
      v-model="confirmOpen"
      :title="expense?.status === 'draft' ? 'Hapus draft beban?' : 'Batalkan beban?'"
      :description="
        expense?.status === 'draft'
          ? 'Draft akan dihapus dan tidak pernah masuk laporan.'
          : 'Beban tetap tersimpan sebagai riwayat, tetapi tidak lagi dihitung di laporan.'
      "
    >
      <p v-if="actionError" class="rounded-2xl bg-error/10 p-4 text-sm text-error">
        {{ actionError }}
      </p>
      <div class="mt-4 flex gap-3">
        <AppButton variant="ghost" :disabled="working" @click="confirmOpen = false">
          Kembali
        </AppButton>
        <AppButton variant="danger" class="flex-1" :loading="working" @click="confirmAction">
          {{ expense?.status === 'draft' ? 'Hapus draft' : 'Batalkan beban' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
