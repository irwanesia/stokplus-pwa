<script setup lang="ts">
import { Info } from '@lucide/vue'
import { reactive, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const session = useSessionStore()
const ui = useUiStore()

const form = reactive({
  nama_usaha: session.profile?.nama_usaha ?? '',
  nama_pemilik: session.profile?.nama_pemilik ?? '',
  telepon: session.profile?.telepon ?? '',
  alamat: session.profile?.alamat ?? '',
  catatan_laporan: session.profile?.catatan_laporan ?? '',
})

const saving = ref(false)
const nameError = ref('')

async function save() {
  nameError.value = ''

  if (!form.nama_usaha.trim()) {
    nameError.value = 'Nama usaha wajib diisi.'
    return
  }

  saving.value = true

  try {
    await session.updateProfile({ ...form })
    ui.notify('Profil usaha disimpan.', 'success')
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Profil gagal disimpan.', 'error', 5000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Profil usaha"
      subtitle="Data ini dipakai di laporan dan layar kunci."
      back-to="/pengaturan"
    />

    <div
      class="flex items-start gap-3 rounded-2xl border border-brand-copper/20 bg-brand-copper/10 p-4"
    >
      <Info class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
      <p class="text-sm leading-6 text-base-content/70">
        Tidak ada field logo. Brand StokPlus memakai monogram <strong>S+</strong> agar tetap
        konsisten di semua perangkat.
      </p>
    </div>

    <AppCard title="Identitas usaha">
      <form class="space-y-4" @submit.prevent="save">
        <FormField label="Nama usaha" for-id="profile-name" required :error="nameError">
          <input
            id="profile-name"
            v-model="form.nama_usaha"
            type="text"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="organization"
            maxlength="80"
          />
        </FormField>

        <FormField label="Nama pemilik" for-id="profile-owner" hint="Opsional.">
          <input
            id="profile-owner"
            v-model="form.nama_pemilik"
            type="text"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="name"
            maxlength="80"
          />
        </FormField>

        <FormField label="Telepon" for-id="profile-phone" hint="Opsional.">
          <input
            id="profile-phone"
            v-model="form.telepon"
            type="tel"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="tel"
            maxlength="30"
          />
        </FormField>

        <FormField label="Alamat" for-id="profile-address" hint="Opsional.">
          <textarea
            id="profile-address"
            v-model="form.alamat"
            class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] bg-base-100"
            maxlength="200"
          />
        </FormField>

        <FormField
          label="Catatan footer laporan"
          for-id="profile-report-note"
          hint="Opsional. Tampil di bagian bawah laporan."
        >
          <textarea
            id="profile-report-note"
            v-model="form.catatan_laporan"
            class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] bg-base-100"
            maxlength="200"
          />
        </FormField>

        <AppButton type="submit" block :loading="saving">Simpan profil</AppButton>
      </form>
    </AppCard>
  </div>
</template>
