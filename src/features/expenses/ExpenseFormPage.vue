<script setup lang="ts">
import { AlertTriangle, Check } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { getExpense, nextExpenseNumber } from '@/expenses/repository'
import type { ExpenseDraft } from '@/expenses/types'
import { EXPENSE_PAYMENT_METHODS } from '@/expenses/validation'
import type { PaymentMethod } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useExpenseStore } from '@/stores/expenses'
import { useUiStore } from '@/stores/ui'
import { todayJakarta } from '@/utils/date'
import { selectOnFocus } from '@/utils/input'

const route = useRoute()
const router = useRouter()
const master = useMasterStore()
const expenses = useExpenseStore()
const ui = useUiStore()
const editingId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id !== 'baru' ? id : ''
})
const initializing = ref(true)
const saving = ref(false)
const formError = ref('')
const nomor = ref('')
const tanggal = ref(todayJakarta())
const categoryId = ref('')
const keterangan = ref('')
const nominal = ref('0')
const metode = ref<PaymentMethod>('tunai')
const activeCategories = computed(() =>
  master.expenseCategories.filter((category) => category.status === 'active'),
)

function toDraft(): ExpenseDraft {
  return {
    nomor_transaksi: nomor.value,
    tanggal: tanggal.value,
    expense_category_id: categoryId.value,
    keterangan: keterangan.value,
    nominal: Number(nominal.value),
    metode_pembayaran: metode.value,
  }
}

async function save(complete: boolean) {
  formError.value = ''
  saving.value = true
  try {
    const result = await expenses.saveAction(toDraft(), {
      id: editingId.value || undefined,
      complete,
    })
    ui.notify(
      result.status === 'completed' ? 'Beban selesai dicatat.' : 'Draft beban disimpan.',
      'success',
      4500,
    )
    await router.push(`/transaksi/beban/${result.id}`)
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Beban gagal disimpan.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await master.load()
    if (editingId.value) {
      const expense = await getExpense(editingId.value)
      if (!expense) {
        ui.notify('Beban tidak ditemukan.', 'error')
        await router.replace('/transaksi/beban')
        return
      }
      if (expense.status !== 'draft') {
        await router.replace(`/transaksi/beban/${expense.id}`)
        return
      }
      nomor.value = expense.nomor_transaksi
      tanggal.value = expense.tanggal
      categoryId.value = expense.expense_category_id
      keterangan.value = expense.keterangan
      nominal.value = String(expense.nominal)
      metode.value = expense.metode_pembayaran
    } else {
      nomor.value = await nextExpenseNumber(tanggal.value)
      categoryId.value = activeCategories.value[0]?.id ?? ''
    }
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Data beban gagal dimuat.'
  } finally {
    initializing.value = false
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :title="editingId ? 'Ubah draft beban' : 'Tambah beban operasional'"
      subtitle="Beban masuk ke opex, bukan HPP, dan tidak mengubah stok."
      back-to="/transaksi/beban"
    />

    <div
      v-if="initializing"
      class="h-52 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
    />
    <template v-else>
      <div
        class="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
        <div class="text-sm leading-6 text-base-content/70">
          <p class="font-semibold text-base-content">Pilih klasifikasi yang tepat</p>
          <p class="mt-1">
            Contoh beban: listrik freezer, sewa, gaji, kebersihan, packaging umum, maintenance, atau
            transport penjualan. Pembelian produk/bahan dagang dicatat sebagai pembelian agar masuk
            ke HPP lot; barang rusak/kedaluwarsa dicatat sebagai kerugian persediaan.
          </p>
          <RouterLink
            to="/master/kategori-beban"
            class="mt-1 inline-block font-semibold text-brand-copper underline underline-offset-2"
          >
            Kelola kategori beban
          </RouterLink>
        </div>
      </div>

      <AppCard title="Informasi beban">
        <div class="grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Nomor transaksi">
              <input
                :value="nomor"
                type="text"
                readonly
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-200"
              />
            </FormField>
            <FormField label="Tanggal" for-id="expense-date" required>
              <input
                id="expense-date"
                v-model="tanggal"
                type="date"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
              />
            </FormField>
          </div>
          <FormField label="Kategori beban" for-id="expense-category" required>
            <select
              id="expense-category"
              v-model="categoryId"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option value="" disabled>Pilih kategori aktif</option>
              <option v-for="category in activeCategories" :key="category.id" :value="category.id">
                {{ category.nama }}
              </option>
            </select>
          </FormField>
          <FormField
            label="Keterangan"
            for-id="expense-description"
            hint="Contoh: Tagihan listrik freezer bulan Oktober."
            required
          >
            <textarea
              id="expense-description"
              v-model="keterangan"
              rows="3"
              class="textarea textarea-bordered w-full rounded-[var(--radius-control)] bg-base-100"
              placeholder="Jelaskan pengeluaran"
            />
          </FormField>
          <FormField
            label="Nominal"
            for-id="expense-amount"
            required
            hint="Rupiah, bilangan bulat lebih dari 0."
          >
            <input
              id="expense-amount"
              v-model="nominal"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
              @focus="selectOnFocus"
            />
          </FormField>
          <FormField label="Metode pembayaran" for-id="expense-payment" required>
            <select
              id="expense-payment"
              v-model="metode"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option
                v-for="method in EXPENSE_PAYMENT_METHODS"
                :key="method.value"
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
          </FormField>
        </div>
      </AppCard>

      <p v-if="activeCategories.length === 0" class="rounded-2xl bg-status-warning/10 p-4 text-sm">
        Belum ada kategori beban aktif. Buat kategori dahulu di
        <RouterLink class="font-semibold text-brand-copper underline" to="/master/kategori-beban">
          Master data → Kategori beban </RouterLink
        >.
      </p>
      <p v-if="formError" class="rounded-2xl bg-error/10 p-4 text-sm text-error">{{ formError }}</p>
      <div class="grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :loading="saving" @click="save(false)"
          >Simpan draft</AppButton
        >
        <AppButton :loading="saving" :disabled="activeCategories.length === 0" @click="save(true)">
          <Check class="h-4 w-4" aria-hidden="true" />
          Selesaikan
        </AppButton>
      </div>
    </template>
  </div>
</template>
