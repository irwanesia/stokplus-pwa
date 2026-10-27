<script setup lang="ts">
import { ArrowRight, Database, ShieldCheck } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import RestoreFlow from '@/components/backup/RestoreFlow.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import FormField from '@/components/forms/FormField.vue'
import PinPad from '@/components/ui/PinPad.vue'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

type Step = 1 | 2 | 3
type PinStage = 'create' | 'confirm'

const router = useRouter()
const session = useSessionStore()
const ui = useUiStore()

const step = ref<Step>(1)
const restoreOpen = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const sampleData = ref(false)
const profileError = ref('')
const pin = ref('')
const pinDraft = ref('')
const pinStage = ref<PinStage>('create')
const pinError = ref('')
const submitting = ref(false)
const submitError = ref('')

const profileForm = reactive({
  nama_usaha: '',
  nama_pemilik: '',
  alamat: '',
  telepon: '',
  catatan_laporan: '',
})

const pinLabel = computed(() =>
  pinStage.value === 'create' ? 'Buat PIN 6 digit' : 'Ulangi PIN 6 digit',
)

const stepLabel = computed(() => {
  if (step.value === 1) return 'Mulai'
  if (step.value === 2) return 'Profil'
  return 'PIN'
})

function goToProfile() {
  step.value = 2
  requestAnimationFrame(() => nameInput.value?.focus())
}

function goToPin() {
  profileError.value = ''

  if (!profileForm.nama_usaha.trim()) {
    profileError.value = 'Nama usaha wajib diisi.'
    nameInput.value?.focus()
    return
  }

  step.value = 3
  pin.value = ''
  pinDraft.value = ''
  pinStage.value = 'create'
  pinError.value = ''
  submitError.value = ''
}

function handlePinComplete(value: string) {
  if (submitting.value) {
    return
  }

  pinError.value = ''

  if (pinStage.value === 'create') {
    pinDraft.value = value
    pin.value = ''
    pinStage.value = 'confirm'
    return
  }

  if (value !== pinDraft.value) {
    pinError.value = 'PIN tidak cocok. Ulangi PIN yang sama.'
    pin.value = ''
    return
  }

  void finish(value)
}

function restartPin() {
  pin.value = ''
  pinDraft.value = ''
  pinStage.value = 'create'
  pinError.value = ''
}

async function finish(value: string) {
  submitting.value = true
  submitError.value = ''

  try {
    const result = await session.completeOnboarding({
      profile: { ...profileForm },
      pin: value,
      sampleData: sampleData.value,
    })

    if (result.sampleWarning) {
      ui.notify(`Setup selesai, tetapi data contoh gagal: ${result.sampleWarning}`, 'warning', 6000)
    } else {
      ui.notify('Setup selesai. Selamat memakai StokPlus.', 'success')
    }

    await router.replace('/')
  } catch (caught) {
    submitError.value = caught instanceof Error ? caught.message : 'Setup gagal. Silakan coba lagi.'
    pin.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-base-200">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
    >
      <header class="flex items-center gap-3">
        <span class="monogram" aria-hidden="true">S+</span>
        <div>
          <p class="text-sm font-semibold tracking-tight">StokPlus</p>
          <p class="text-[11px] text-base-content/65">Lebih dari sekadar stok.</p>
        </div>
      </header>

      <main class="flex flex-1 flex-col justify-center py-8">
        <section v-if="step === 1" class="space-y-6">
          <div class="hero-card p-6 text-white">
            <p class="text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase">
              Selamat datang
            </p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight">StokPlus</h1>
            <p class="mt-2 text-sm leading-6 text-white/65">
              Kelola stok, penjualan, pembelian, dan laba usaha frozen food dari satu HP.
            </p>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <Database class="h-5 w-5 text-brand-copper" aria-hidden="true" />
                <p class="mt-2 text-sm font-semibold">Data lokal</p>
                <p class="mt-0.5 text-[11px] text-white/55">Tanpa server</p>
              </div>
              <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <ShieldCheck class="h-5 w-5 text-brand-copper" aria-hidden="true" />
                <p class="mt-2 text-sm font-semibold">PIN 6 digit</p>
                <p class="mt-0.5 text-[11px] text-white/55">Kunci lokal</p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <AppButton block size="lg" @click="goToProfile">
              Mulai Baru
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </AppButton>
            <AppButton block variant="secondary" @click="restoreOpen = true">
              Pulihkan Backup
            </AppButton>
          </div>

          <p class="text-center text-xs leading-5 text-base-content/65">
            Data disimpan di perangkat ini. Tidak ada akun email atau sinkronisasi cloud pada MVP.
          </p>
        </section>

        <section v-else-if="step === 2" class="space-y-6">
          <div>
            <p class="text-[10px] font-semibold tracking-[0.18em] text-brand-copper uppercase">
              Langkah 2 dari 3
            </p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">Profil usaha</h1>
            <p class="mt-1 text-sm leading-6 text-base-content/65">
              Nama usaha diperlukan. Tidak ada upload logo; brand memakai monogram S+.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="goToPin">
            <FormField label="Nama usaha" for-id="business-name" required :error="profileError">
              <input
                id="business-name"
                ref="nameInput"
                v-model="profileForm.nama_usaha"
                type="text"
                class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
                placeholder="Contoh: Frozen Food Bu Rina"
                autocomplete="organization"
                maxlength="80"
              />
            </FormField>

            <FormField label="Nama pemilik" for-id="owner-name" hint="Opsional.">
              <input
                id="owner-name"
                v-model="profileForm.nama_pemilik"
                type="text"
                class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
                placeholder="Nama pemilik"
                autocomplete="name"
                maxlength="80"
              />
            </FormField>

            <FormField label="Telepon" for-id="business-phone" hint="Opsional.">
              <input
                id="business-phone"
                v-model="profileForm.telepon"
                type="tel"
                class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
                placeholder="08xx xxxx xxxx"
                autocomplete="tel"
                maxlength="30"
              />
            </FormField>

            <FormField label="Alamat" for-id="business-address" hint="Opsional.">
              <textarea
                id="business-address"
                v-model="profileForm.alamat"
                class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] bg-base-100"
                placeholder="Alamat usaha"
                maxlength="200"
              />
            </FormField>

            <FormField
              label="Catatan footer laporan"
              for-id="report-note"
              hint="Opsional, tampil di bagian bawah laporan."
            >
              <textarea
                id="report-note"
                v-model="profileForm.catatan_laporan"
                class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] bg-base-100"
                placeholder="Contoh: Terima kasih sudah berbelanja."
                maxlength="200"
              />
            </FormField>

            <label
              class="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-border bg-base-100 p-4"
            >
              <input v-model="sampleData" type="checkbox" class="toggle toggle-primary mt-0.5" />
              <span>
                <span class="block text-sm font-semibold">Isi data contoh</span>
                <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
                  Menambahkan unit, kategori, produk, supplier, pelanggan, dan kategori beban untuk
                  evaluasi. Default mati.
                </span>
              </span>
            </label>

            <div class="flex gap-3">
              <AppButton variant="ghost" @click="step = 1">Kembali</AppButton>
              <AppButton type="submit" class="flex-1">Lanjut</AppButton>
            </div>
          </form>
        </section>

        <section v-else class="space-y-6">
          <div>
            <p class="text-[10px] font-semibold tracking-[0.18em] text-brand-copper uppercase">
              Langkah 3 dari 3
            </p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
              {{ pinStage === 'create' ? 'Buat PIN' : 'Konfirmasi PIN' }}
            </h1>
            <p class="mt-1 text-sm leading-6 text-base-content/65">
              PIN 6 digit dipakai untuk membuka aplikasi. PIN tidak dapat dipulihkan.
            </p>
          </div>

          <div class="surface-card p-5">
            <PinPad
              v-model="pin"
              :label="pinLabel"
              :error="pinError"
              :disabled="submitting"
              @complete="handlePinComplete"
            />

            <p
              v-if="submitError"
              class="mt-4 text-center text-sm font-medium text-error"
              role="alert"
            >
              {{ submitError }}
            </p>

            <div class="mt-5 flex items-center justify-between gap-3">
              <AppButton variant="ghost" :disabled="submitting" @click="step = 2">
                Kembali
              </AppButton>
              <button
                v-if="pinStage === 'confirm'"
                type="button"
                class="text-sm font-medium text-brand-copper"
                :disabled="submitting"
                @click="restartPin"
              >
                Buat ulang PIN
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer class="space-y-3">
        <div
          class="flex items-center justify-center gap-2"
          role="group"
          aria-label="Progres onboarding"
        >
          <span
            v-for="index in 3"
            :key="index"
            class="h-1.5 rounded-full transition-all"
            :class="index <= step ? 'w-8 bg-brand-copper' : 'w-4 bg-base-300'"
          />
        </div>
        <p class="text-center text-[11px] text-base-content/65">{{ stepLabel }}</p>
      </footer>
    </div>

    <AppBottomSheet
      v-model="restoreOpen"
      title="Pulihkan Backup"
      description="Pilih file backup StokPlus untuk memulihkan seluruh data dan PIN."
    >
      <RestoreFlow onboarding />
    </AppBottomSheet>
  </div>
</template>
