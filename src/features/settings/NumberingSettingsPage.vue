<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { PREFIX_KEYS, PREFIX_LABELS } from '@/db/settings'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'
import { formatCounterPreview, normalizePrefix, validatePrefix } from '@/utils/numbering'
import { selectOnFocus } from '@/utils/input'

const session = useSessionStore()
const ui = useUiStore()

const form = reactive({
  prefix_sale: session.settings.prefix_sale,
  prefix_purchase: session.settings.prefix_purchase,
  prefix_expense: session.settings.prefix_expense,
  prefix_opname: session.settings.prefix_opname,
  prefix_writeoff: session.settings.prefix_writeoff,
  expiry_alert_default_days: session.settings.expiry_alert_default_days,
  cutover_date: session.settings.cutover_date,
})

type FormKey = keyof typeof form
type ErrorMap = Partial<Record<FormKey, string>>

const errors = ref<ErrorMap>({})
const saving = ref(false)

const previews = computed(() =>
  PREFIX_KEYS.map((key) => ({
    key,
    label: PREFIX_LABELS[key],
    preview: formatCounterPreview(form[key]),
  })),
)

function validate(): boolean {
  const next: ErrorMap = {}

  for (const key of PREFIX_KEYS) {
    const error = validatePrefix(form[key])
    if (error) {
      next[key] = error
    }
  }

  const expiry = Number(form.expiry_alert_default_days)
  if (!Number.isInteger(expiry) || expiry < 1 || expiry > 365) {
    next.expiry_alert_default_days = 'Default expiry harus 1–365 hari.'
  }

  errors.value = next
  return Object.keys(next).length === 0
}

async function save() {
  if (!validate()) {
    return
  }

  saving.value = true

  try {
    const patch = {
      prefix_sale: normalizePrefix(form.prefix_sale),
      prefix_purchase: normalizePrefix(form.prefix_purchase),
      prefix_expense: normalizePrefix(form.prefix_expense),
      prefix_opname: normalizePrefix(form.prefix_opname),
      prefix_writeoff: normalizePrefix(form.prefix_writeoff),
      expiry_alert_default_days: Number(form.expiry_alert_default_days),
      cutover_date: form.cutover_date,
    }

    await session.updateSettings(patch)
    Object.assign(form, patch)
    ui.notify('Pengaturan penomoran disimpan.', 'success')
  } catch (caught) {
    ui.notify(
      caught instanceof Error ? caught.message : 'Pengaturan gagal disimpan.',
      'error',
      5000,
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Penomoran & default"
      subtitle="Prefix nomor transaksi dan preferensi operasional."
      back-to="/pengaturan"
    />

    <AppCard title="Prefix transaksi" subtitle="Counter berjalan otomatis; tidak ada reset manual.">
      <form class="space-y-4" @submit.prevent="save">
        <FormField
          v-for="key in PREFIX_KEYS"
          :key="key"
          :label="PREFIX_LABELS[key]"
          :for-id="`prefix-${key}`"
          :error="errors[key]"
          hint="2–5 karakter huruf/angka."
        >
          <input
            :id="`prefix-${key}`"
            v-model="form[key]"
            type="text"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100 font-semibold tracking-wide uppercase"
            maxlength="5"
            autocomplete="off"
          />
        </FormField>

        <div class="rounded-2xl border border-brand-border bg-base-200/70 p-4">
          <p class="text-xs font-semibold tracking-wide text-base-content/65 uppercase">
            Preview format
          </p>
          <div class="mt-2 space-y-1.5">
            <div v-for="preview in previews" :key="preview.key" class="flex justify-between gap-3">
              <span class="text-xs text-base-content/65">{{ preview.label }}</span>
              <span class="tabular text-xs font-semibold text-brand-navy">{{
                preview.preview
              }}</span>
            </div>
          </div>
        </div>

        <FormField
          label="Default expiry alert"
          for-id="expiry-alert"
          :error="errors.expiry_alert_default_days"
          hint="Dipakai untuk produk yang belum punya override."
        >
          <div class="flex items-center gap-2">
            <input
              id="expiry-alert"
              v-model.number="form.expiry_alert_default_days"
              type="number"
              min="1"
              max="365"
              inputmode="numeric"
              class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
              @focus="selectOnFocus"
            />
            <span class="text-sm text-base-content/65">hari</span>
          </div>
        </FormField>

        <FormField
          label="Tanggal cutover"
          for-id="cutover-date"
          hint="Tanggal mulai ledger aktif. Boleh dikosongkan sampai migrasi Phase 11."
        >
          <input
            id="cutover-date"
            v-model="form.cutover_date"
            type="date"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
          />
        </FormField>

        <AppButton type="submit" block :loading="saving">Simpan pengaturan</AppButton>
      </form>
    </AppCard>
  </div>
</template>
