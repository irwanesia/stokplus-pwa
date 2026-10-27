<script setup lang="ts">
import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Printer,
  RotateCcw,
  Save,
  TriangleAlert,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import {
  createEmptyUatState,
  loadUatState,
  saveUatState,
  signOffReady,
  uatSummary,
  UAT_SCENARIOS,
  type UatResult,
  type UatState,
} from '@/features/release/uat'
import { useUiStore } from '@/stores/ui'
import { formatDateTimeId } from '@/utils/date'

const ui = useUiStore()
const state = ref<UatState>(createEmptyUatState())
const resetOpen = ref(false)
const loaded = ref(false)

const summary = computed(() => uatSummary(state.value))
const canSignOff = computed(() => signOffReady(state.value))
const statusLabel: Record<UatResult, string> = {
  pending: 'Belum',
  pass: 'Lulus',
  fail: 'Gagal',
}

onMounted(() => {
  state.value = loadUatState()
  loaded.value = true
})

function persist() {
  state.value = saveUatState(state.value)
}

function setResult(id: string, result: UatResult) {
  state.value.results[id] = result
  persist()
}

function persistNote() {
  persist()
}

function approve() {
  if (!canSignOff.value) {
    return
  }

  state.value.signOff.approvedAt = new Date().toISOString()
  persist()
  ui.notify('Sign-off UAT tersimpan di perangkat ini.', 'success', 4000)
}

function resetUat() {
  state.value = createEmptyUatState()
  persist()
  resetOpen.value = false
  ui.notify('Hasil UAT direset.', 'warning', 3000)
}

function printUat() {
  window.print()
}
</script>

<template>
  <div class="page-stack print-report">
    <PageHeader
      title="UAT & sign-off"
      subtitle="Jalankan skenario UAT, catat hasil, lalu simpan sign-off rilis MVP."
      back-to="/lainnya"
    />

    <AppCard tone="muted">
      <div class="flex items-start gap-3">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white"
          aria-hidden="true"
        >
          <ClipboardCheck class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">
            {{ summary.passed }} / {{ summary.total }} skenario lulus · {{ summary.percent }}%
          </p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Gate UAT: minimal {{ summary.requiredPassed }} skenario lulus (90%) dan tidak ada
            skenario gagal.
          </p>
        </div>
        <span
          class="badge shrink-0 rounded-full px-3 py-3 text-[11px] font-semibold"
          :class="
            summary.gateMet
              ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
              : 'border-warning/20 bg-warning/10 text-warning'
          "
        >
          {{ summary.gateMet ? 'Memenuhi' : 'Belum' }}
        </span>
      </div>

      <progress
        class="progress mt-4 w-full"
        :class="summary.gateMet ? 'progress-success' : 'progress-warning'"
        :value="summary.percent"
        max="100"
        aria-label="Persentase UAT lulus"
      />

      <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="rounded-xl bg-status-completed/10 p-2">
          <p class="text-base font-semibold text-status-completed">{{ summary.passed }}</p>
          <p class="mt-0.5 text-base-content/65">Lulus</p>
        </div>
        <div class="rounded-xl bg-error/10 p-2">
          <p class="text-base font-semibold text-error">{{ summary.failed }}</p>
          <p class="mt-0.5 text-base-content/65">Gagal</p>
        </div>
        <div class="rounded-xl bg-base-200 p-2">
          <p class="text-base font-semibold">{{ summary.pending }}</p>
          <p class="mt-0.5 text-base-content/65">Belum</p>
        </div>
      </div>
    </AppCard>

    <div class="no-print flex flex-wrap gap-2">
      <AppButton variant="secondary" @click="printUat">
        <Printer class="h-4 w-4" aria-hidden="true" />
        Cetak hasil
      </AppButton>
      <AppButton variant="ghost" @click="resetOpen = true">
        <RotateCcw class="h-4 w-4" aria-hidden="true" />
        Reset hasil
      </AppButton>
    </div>

    <AppCard
      v-for="scenario in UAT_SCENARIOS"
      :key="scenario.id"
      :title="`${scenario.id} — ${scenario.title}`"
    >
      <dl class="space-y-2 text-sm">
        <div>
          <dt class="text-[11px] font-semibold tracking-wide text-base-content/65 uppercase">
            Langkah
          </dt>
          <dd class="mt-0.5 leading-6 text-base-content/75">{{ scenario.steps }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold tracking-wide text-base-content/65 uppercase">
            Expected
          </dt>
          <dd class="mt-0.5 leading-6 text-base-content/75">{{ scenario.expected }}</dd>
        </div>
      </dl>

      <fieldset class="mt-4">
        <legend class="sr-only">Hasil {{ scenario.id }}</legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="result in ['pass', 'fail', 'pending'] as UatResult[]"
            :key="result"
            type="button"
            class="btn btn-sm min-h-11 rounded-full px-4 normal-case"
            :class="
              state.results[scenario.id] === result
                ? result === 'pass'
                  ? 'btn-success'
                  : result === 'fail'
                    ? 'btn-error'
                    : 'btn-neutral'
                : 'btn-ghost border-brand-border'
            "
            :aria-pressed="state.results[scenario.id] === result"
            :aria-label="`${statusLabel[result]} ${scenario.id}`"
            @click="setResult(scenario.id, result)"
          >
            <CircleCheck v-if="result === 'pass'" class="h-4 w-4" aria-hidden="true" />
            <CircleX v-else-if="result === 'fail'" class="h-4 w-4" aria-hidden="true" />
            <TriangleAlert v-else class="h-4 w-4" aria-hidden="true" />
            {{ statusLabel[result] }}
          </button>
        </div>
      </fieldset>

      <label
        :for="`uat-note-${scenario.id}`"
        class="mt-3 block text-xs font-medium text-base-content/65"
      >
        Catatan {{ scenario.id }}
      </label>
      <textarea
        :id="`uat-note-${scenario.id}`"
        v-model="state.notes[scenario.id]"
        rows="2"
        class="textarea textarea-bordered mt-1 w-full rounded-[var(--radius-control)] text-sm"
        :placeholder="`Masalah, perangkat, atau bukti untuk ${scenario.id}`"
        @change="persistNote"
      />
    </AppCard>

    <AppCard title="Sign-off" subtitle="Diisi setelah seluruh skenario UAT dijalankan.">
      <div v-if="!loaded" class="text-sm text-base-content/65">Memuat hasil UAT…</div>

      <template v-else>
        <div
          v-if="state.signOff.approvedAt"
          class="mb-4 flex items-start gap-2 rounded-xl bg-status-completed/10 p-3"
        >
          <CircleCheck class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          <p class="text-xs leading-5 text-base-content/75">
            Sign-off disimpan
            <span class="font-semibold">{{ formatDateTimeId(state.signOff.approvedAt) }}</span
            >. Tanggal UAT: {{ state.signOff.date }}.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label for="uat-po" class="block text-sm font-medium">Product Owner</label>
            <input
              id="uat-po"
              v-model="state.signOff.productOwner"
              type="text"
              class="input input-bordered mt-1 min-h-12 w-full rounded-[var(--radius-control)]"
              autocomplete="name"
              @change="persist"
            />
          </div>
          <div>
            <label for="uat-dev" class="block text-sm font-medium">Developer</label>
            <input
              id="uat-dev"
              v-model="state.signOff.developer"
              type="text"
              class="input input-bordered mt-1 min-h-12 w-full rounded-[var(--radius-control)]"
              autocomplete="name"
              @change="persist"
            />
          </div>
          <div>
            <label for="uat-qa" class="block text-sm font-medium">QA/UAT</label>
            <input
              id="uat-qa"
              v-model="state.signOff.qa"
              type="text"
              class="input input-bordered mt-1 min-h-12 w-full rounded-[var(--radius-control)]"
              autocomplete="name"
              @change="persist"
            />
          </div>
          <div>
            <label for="uat-date" class="block text-sm font-medium">Tanggal UAT</label>
            <input
              id="uat-date"
              v-model="state.signOff.date"
              type="date"
              class="input input-bordered mt-1 min-h-12 w-full rounded-[var(--radius-control)]"
              @change="persist"
            />
          </div>
        </div>

        <p v-if="!summary.gateMet" class="mt-4 text-xs leading-5 text-warning" role="status">
          Selesaikan minimal {{ summary.requiredPassed }} skenario tanpa kegagalan sebelum sign-off.
        </p>
        <p v-else-if="!canSignOff" class="mt-4 text-xs leading-5 text-warning" role="status">
          Isi nama Product Owner, Developer, QA/UAT, dan tanggal UAT.
        </p>

        <AppButton class="mt-4" block :disabled="!canSignOff" @click="approve">
          <Save class="h-4 w-4" aria-hidden="true" />
          Simpan sign-off
        </AppButton>
      </template>
    </AppCard>

    <p class="px-1 text-xs leading-5 text-base-content/65">
      Hasil UAT disimpan di localStorage perangkat ini dan tidak masuk backup domain. Untuk bukti
      rilis, cetak halaman ini atau salin hasilnya ke
      <code class="font-semibold">docs/UAT.md</code>.
    </p>

    <AppBottomSheet
      v-model="resetOpen"
      title="Reset hasil UAT?"
      description="Seluruh status, catatan, dan sign-off UAT di perangkat ini akan dihapus."
    >
      <div class="mt-2 flex gap-3">
        <AppButton variant="ghost" @click="resetOpen = false">Batal</AppButton>
        <AppButton variant="danger" class="flex-1" @click="resetUat">Reset hasil</AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
