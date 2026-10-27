export type UatResult = 'pending' | 'pass' | 'fail'

export interface UatScenario {
  id: string
  title: string
  steps: string
  expected: string
}

export interface UatSignOff {
  productOwner: string
  developer: string
  qa: string
  date: string
  approvedAt: string | null
}

export interface UatState {
  results: Record<string, UatResult>
  notes: Record<string, string>
  signOff: UatSignOff
  updatedAt: string | null
}

export interface UatSummary {
  total: number
  passed: number
  failed: number
  pending: number
  percent: number
  requiredPassed: number
  gateMet: boolean
}

export const UAT_STORAGE_KEY = 'stokplus-uat-v1'
export const UAT_PASS_THRESHOLD = 0.9

export const UAT_SCENARIOS: UatScenario[] = [
  {
    id: 'UAT-01',
    title: 'Onboarding',
    steps: 'Buat usaha baru dan PIN 6 digit.',
    expected: 'Dashboard terbuka dan PIN diminta saat aplikasi dibuka ulang.',
  },
  {
    id: 'UAT-02',
    title: 'Master multi-unit',
    steps: 'Buat produk Siomay dengan satuan pcs, pack 10, dan dus 100.',
    expected: 'Konversi qty base benar dan barcode duplikat ditolak.',
  },
  {
    id: 'UAT-03',
    title: 'Opening lot',
    steps: 'Isi stok awal produk track-expiry beserta tanggal expiry.',
    expected: 'Lot awal terbentuk dan stok produk bertambah.',
  },
  {
    id: 'UAT-04',
    title: 'Pembelian',
    steps: 'Catat pembelian 2 dus Siomay dengan expiry lalu selesaikan.',
    expected: 'Stok naik, lot dan expiry tersimpan, HPP per base tampil.',
  },
  {
    id: 'UAT-05',
    title: 'Penjualan FEFO',
    steps: 'Jual 3 pack Siomay saat tersedia dua lot dengan expiry berbeda.',
    expected: 'Lot dengan expiry terdekat dikonsumsi lebih dulu dan laba kotor tampil.',
  },
  {
    id: 'UAT-06',
    title: 'Stok kurang',
    steps: 'Coba jual melebihi stok non-expired.',
    expected: 'Transaksi ditolak tanpa mengubah stok atau lot.',
  },
  {
    id: 'UAT-07',
    title: 'Beban',
    steps: 'Catat beban listrik dan sewa, lalu selesaikan.',
    expected: 'Laba bersih turun dan HPP tidak berubah.',
  },
  {
    id: 'UAT-08',
    title: 'Expiry',
    steps: 'Write-off lot expired dari halaman expiry.',
    expected: 'Stok turun, movement tercatat, dan kerugian persediaan tampil.',
  },
  {
    id: 'UAT-09',
    title: 'Stok opname',
    steps: 'Catat opname dengan stok fisik lebih kecil dari sistem.',
    expected: 'Shortage dialokasikan ke lot expiry terdekat dan laba/rugi menyesuaikan.',
  },
  {
    id: 'UAT-10',
    title: 'Laporan',
    steps: 'Buka laporan laba/rugi pada periode data UAT.',
    expected: 'Penjualan, HPP, beban, kerugian persediaan, dan laba bersih konsisten.',
  },
  {
    id: 'UAT-11',
    title: 'Export',
    steps: 'Export laporan penjualan ke Excel.',
    expected: 'File xlsx terunduh dan dapat dibuka.',
  },
  {
    id: 'UAT-12',
    title: 'Backup/restore',
    steps: 'Buat backup, reset data, lalu restore dari onboarding.',
    expected: 'Profil, PIN, master, transaksi, lot, dan expiry kembali.',
  },
  {
    id: 'UAT-13',
    title: 'Offline',
    steps: 'Aktifkan mode pesawat, buka aplikasi, lalu catat transaksi.',
    expected: 'App shell tetap terbuka dan transaksi tersimpan lokal.',
  },
  {
    id: 'UAT-14',
    title: 'Install',
    steps: 'Pasang aplikasi ke layar utama dari Android atau iOS.',
    expected: 'StokPlus terbuka dalam mode standalone tanpa address bar.',
  },
  {
    id: 'UAT-15',
    title: 'Migrasi',
    steps: 'Import file export Laravel sample dan lengkapi opening lot.',
    expected: 'Stok awal sama dengan sumber, HPP estimasi berlabel, dan rekonsiliasi cocok.',
  },
]

export function createEmptyUatState(): UatState {
  return {
    results: Object.fromEntries(UAT_SCENARIOS.map((scenario) => [scenario.id, 'pending'])),
    notes: {},
    signOff: {
      productOwner: '',
      developer: '',
      qa: '',
      date: '',
      approvedAt: null,
    },
    updatedAt: null,
  }
}

function normalizeState(value: Partial<UatState> | null | undefined): UatState {
  const empty = createEmptyUatState()

  if (!value) {
    return empty
  }

  for (const scenario of UAT_SCENARIOS) {
    const result = value.results?.[scenario.id]
    empty.results[scenario.id] =
      result === 'pass' || result === 'fail' || result === 'pending' ? result : 'pending'

    const note = value.notes?.[scenario.id]
    if (typeof note === 'string') {
      empty.notes[scenario.id] = note
    }
  }

  empty.signOff = {
    productOwner: value.signOff?.productOwner ?? '',
    developer: value.signOff?.developer ?? '',
    qa: value.signOff?.qa ?? '',
    date: value.signOff?.date ?? '',
    approvedAt: value.signOff?.approvedAt ?? null,
  }
  empty.updatedAt = value.updatedAt ?? null

  return empty
}

export function loadUatState(storage?: Pick<Storage, 'getItem'> | null): UatState {
  const target = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)

  if (!target) {
    return createEmptyUatState()
  }

  try {
    const raw = target.getItem(UAT_STORAGE_KEY)
    if (!raw) {
      return createEmptyUatState()
    }

    return normalizeState(JSON.parse(raw) as Partial<UatState>)
  } catch {
    return createEmptyUatState()
  }
}

export function saveUatState(state: UatState, storage?: Pick<Storage, 'setItem'> | null): UatState {
  const target = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
  const next = {
    ...normalizeState(state),
    updatedAt: new Date().toISOString(),
  }

  if (target) {
    try {
      target.setItem(UAT_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage penuh atau diblokir; state tetap dipakai selama sesi berjalan.
    }
  }

  return next
}

export function uatSummary(state: UatState): UatSummary {
  const total = UAT_SCENARIOS.length
  const passed = UAT_SCENARIOS.filter((scenario) => state.results[scenario.id] === 'pass').length
  const failed = UAT_SCENARIOS.filter((scenario) => state.results[scenario.id] === 'fail').length
  const pending = total - passed - failed
  const percent = total === 0 ? 0 : Math.round((passed / total) * 100)
  const requiredPassed = Math.ceil(total * UAT_PASS_THRESHOLD)

  return {
    total,
    passed,
    failed,
    pending,
    percent,
    requiredPassed,
    gateMet: passed >= requiredPassed && failed === 0,
  }
}

export function signOffReady(state: UatState): boolean {
  const summary = uatSummary(state)
  const signOff = state.signOff

  return (
    summary.gateMet &&
    signOff.productOwner.trim().length > 0 &&
    signOff.developer.trim().length > 0 &&
    signOff.qa.trim().length > 0 &&
    signOff.date.trim().length > 0
  )
}
