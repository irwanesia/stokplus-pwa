<script setup lang="ts">
import { AlertTriangle, ClipboardList } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import { getStockLedger } from '@/inventory/repository'
import type { StockLedger } from '@/inventory/types'
import { formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

const route = useRoute()
const ledger = ref<StockLedger | null>(null)
const error = ref('')

const movementLabel: Record<string, string> = {
  opening: 'Stok awal',
  purchase_in: 'Pembelian masuk',
  purchase_cancel: 'Pembatalan pembelian',
  sale_out: 'Penjualan keluar',
  sale_cancel: 'Pembatalan penjualan',
  opname_shortage: 'Opname kurang',
  opname_surplus: 'Opname lebih',
  writeoff_expired: 'Write-off expired',
  writeoff_damaged: 'Write-off rusak',
  writeoff_other: 'Write-off lainnya',
  writeoff_cancel: 'Pembatalan write-off',
  import_opening: 'Import stok awal',
}

onMounted(async () => {
  try {
    const id = typeof route.params.id === 'string' ? route.params.id : ''
    ledger.value = await getStockLedger(id)
    if (!ledger.value) error.value = 'Produk tidak ditemukan.'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Kartu stok gagal dimuat.'
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Kartu stok"
      :subtitle="ledger?.product.nama ?? 'Memuat produk.'"
      back-to="/stok"
    />
    <p v-if="error" class="rounded-2xl bg-error/10 p-4 text-sm text-error" role="alert">
      {{ error }}
    </p>
    <template v-else-if="ledger">
      <AppCard
        :title="`${ledger.product.stock_base} ${ledger.baseUnitSymbol}`"
        subtitle="Saldo stok produk"
      >
        <p class="text-xs text-base-content/65">
          Nilai persediaan:
          {{ formatRupiah(ledger.lots.reduce((sum, lot) => sum + lot.remainingValue, 0)) }}
        </p>
      </AppCard>
      <AppCard title="Lot persediaan" :subtitle="`${ledger.lots.length} lot · HPP per base`">
        <div v-if="ledger.lots.length" class="space-y-3">
          <div
            v-for="lot in ledger.lots"
            :key="lot.id"
            class="rounded-xl border border-brand-border/70 p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-semibold">{{ lot.lot_code }}</p>
                <p class="mt-0.5 text-xs text-base-content/65">
                  Expiry {{ formatDateId(lot.expiry_date) }} · masuk
                  {{ formatDateId(lot.received_at) }}
                </p>
              </div>
              <StatusChip
                :status="
                  lot.status === 'quarantined'
                    ? 'quarantine'
                    : lot.status === 'depleted' || (lot.daysToExpiry ?? 0) < 0
                      ? 'expired'
                      : 'normal'
                "
                :label="
                  lot.status === 'quarantined'
                    ? undefined
                    : lot.status === 'depleted' || (lot.daysToExpiry ?? 0) < 0
                      ? 'Expired'
                      : undefined
                "
              />
            </div>
            <div class="mt-3 flex items-center justify-between gap-2 text-xs">
              <span
                >{{ lot.qty_remaining_base }} {{ ledger.baseUnitSymbol }} · HPP
                {{ formatRupiah(lot.unit_cost_base) }}</span
              >
              <span class="font-semibold">{{ formatRupiah(lot.remainingValue) }}</span>
            </div>
            <RouterLink
              v-if="lot.qty_remaining_base > 0"
              :to="`/stok/writeoff/baru?lot_id=${lot.id}`"
              class="mt-2 inline-block text-xs font-semibold text-brand-copper underline underline-offset-2"
            >
              Buat write-off
            </RouterLink>
          </div>
        </div>
        <p v-else class="text-sm text-base-content/65">Belum ada lot persediaan.</p>
      </AppCard>
      <AppCard title="Mutasi stok" :subtitle="`${ledger.movements.length} catatan ledger`">
        <div v-if="ledger.movements.length" class="space-y-3">
          <div
            v-for="movement in ledger.movements"
            :key="movement.id"
            class="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold">
                {{ movementLabel[movement.tipe] ?? movement.tipe }}
              </p>
              <p class="mt-0.5 text-xs text-base-content/65">
                {{ formatDateId(movement.tanggal) }} · {{ movement.keterangan }}
              </p>
              <p class="mt-0.5 text-[11px] text-base-content/65">
                Saldo {{ movement.stock_before_base }} → {{ movement.stock_after_base }}
                {{ ledger.baseUnitSymbol }}
              </p>
            </div>
            <span class="shrink-0 text-xs font-semibold tabular">
              {{ movement.stock_after_base >= movement.stock_before_base ? '+' : '−'
              }}{{ movement.qty_base }}
            </span>
          </div>
        </div>
        <div v-else class="flex items-center gap-2 text-sm text-base-content/65">
          <ClipboardList class="h-4 w-4" aria-hidden="true" />Belum ada mutasi stok.
        </div>
      </AppCard>
      <div
        v-if="
          ledger.product.stock_base !==
          ledger.lots.reduce((sum, lot) => sum + lot.qty_remaining_base, 0)
        "
        class="flex items-start gap-2 rounded-2xl bg-error/10 p-4 text-sm text-error"
        role="alert"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Saldo produk berbeda dari jumlah saldo lot. Selesaikan rekonsiliasi sebelum finalisasi
        opname.
      </div>
    </template>
  </div>
</template>
