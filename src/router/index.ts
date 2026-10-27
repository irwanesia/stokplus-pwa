import { createRouter, createWebHistory } from 'vue-router'

import DashboardPage from '@/features/dashboard/DashboardPage.vue'

const MorePage = () => import('@/features/more/MorePage.vue')
const GlossaryPage = () => import('@/features/more/GlossaryPage.vue')
const UserGuidePage = () => import('@/features/release/UserGuidePage.vue')
const UatPage = () => import('@/features/release/UatPage.vue')
const ReportsPage = () => import('@/features/reports/ReportsPage.vue')
const StockPage = () => import('@/features/stock/StockPage.vue')
const StockDetailPage = () => import('@/features/stock/StockDetailPage.vue')
const ExpiryPage = () => import('@/features/stock/ExpiryPage.vue')
const WriteoffsPage = () => import('@/features/stock/WriteoffsPage.vue')
const StocktakesPage = () => import('@/features/stock/StocktakesPage.vue')
const TransactionsPage = () => import('@/features/transactions/TransactionsPage.vue')
const MasterHubPage = () => import('@/features/master/MasterHubPage.vue')
const ProductsPage = () => import('@/features/master/ProductsPage.vue')
const ProductFormPage = () => import('@/features/master/ProductFormPage.vue')
const CategoriesPage = () => import('@/features/master/CategoriesPage.vue')
const UnitsPage = () => import('@/features/master/UnitsPage.vue')
const SuppliersPage = () => import('@/features/master/SuppliersPage.vue')
const CustomersPage = () => import('@/features/master/CustomersPage.vue')
const ExpenseCategoriesPage = () => import('@/features/master/ExpenseCategoriesPage.vue')
const PurchasesPage = () => import('@/features/purchases/PurchasesPage.vue')
const PurchaseFormPage = () => import('@/features/purchases/PurchaseFormPage.vue')
const PurchaseDetailPage = () => import('@/features/purchases/PurchaseDetailPage.vue')
const SalesPage = () => import('@/features/sales/SalesPage.vue')
const SaleFormPage = () => import('@/features/sales/SaleFormPage.vue')
const SaleDetailPage = () => import('@/features/sales/SaleDetailPage.vue')
const ExpensesPage = () => import('@/features/expenses/ExpensesPage.vue')
const ExpenseFormPage = () => import('@/features/expenses/ExpenseFormPage.vue')
const ExpenseDetailPage = () => import('@/features/expenses/ExpenseDetailPage.vue')
const SettingsHubPage = () => import('@/features/settings/SettingsHubPage.vue')
const ProfileSettingsPage = () => import('@/features/settings/ProfileSettingsPage.vue')
const NumberingSettingsPage = () => import('@/features/settings/NumberingSettingsPage.vue')
const SecuritySettingsPage = () => import('@/features/settings/SecuritySettingsPage.vue')
const StorageSettingsPage = () => import('@/features/settings/StorageSettingsPage.vue')
const BackupSettingsPage = () => import('@/features/settings/BackupSettingsPage.vue')
const RestoreSettingsPage = () => import('@/features/settings/RestoreSettingsPage.vue')
const PwaSettingsPage = () => import('@/features/settings/PwaSettingsPage.vue')
const AboutPage = () => import('@/features/settings/AboutPage.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
      meta: { title: 'Dashboard' },
    },
    {
      path: '/transaksi',
      name: 'transactions',
      component: TransactionsPage,
      meta: { title: 'Transaksi' },
    },
    {
      path: '/transaksi/pembelian',
      name: 'purchases',
      component: PurchasesPage,
      meta: { title: 'Pembelian' },
    },
    {
      path: '/transaksi/pembelian/baru',
      name: 'purchase-create',
      component: PurchaseFormPage,
      meta: { title: 'Tambah Pembelian' },
    },
    {
      path: '/transaksi/pembelian/:id/ubah',
      name: 'purchase-edit',
      component: PurchaseFormPage,
      meta: { title: 'Ubah Pembelian' },
    },
    {
      path: '/transaksi/pembelian/:id',
      name: 'purchase-detail',
      component: PurchaseDetailPage,
      meta: { title: 'Detail Pembelian' },
    },
    {
      path: '/transaksi/penjualan',
      name: 'sales',
      component: SalesPage,
      meta: { title: 'Penjualan' },
    },
    {
      path: '/transaksi/penjualan/baru',
      name: 'sale-create',
      component: SaleFormPage,
      meta: { title: 'Tambah Penjualan' },
    },
    {
      path: '/transaksi/penjualan/:id/ubah',
      name: 'sale-edit',
      component: SaleFormPage,
      meta: { title: 'Ubah Penjualan' },
    },
    {
      path: '/transaksi/penjualan/:id',
      name: 'sale-detail',
      component: SaleDetailPage,
      meta: { title: 'Detail Penjualan' },
    },
    {
      path: '/transaksi/beban',
      name: 'expenses',
      component: ExpensesPage,
      meta: { title: 'Beban Operasional' },
    },
    {
      path: '/transaksi/beban/baru',
      name: 'expense-create',
      component: ExpenseFormPage,
      meta: { title: 'Tambah Beban' },
    },
    {
      path: '/transaksi/beban/:id/ubah',
      name: 'expense-edit',
      component: ExpenseFormPage,
      meta: { title: 'Ubah Beban' },
    },
    {
      path: '/transaksi/beban/:id',
      name: 'expense-detail',
      component: ExpenseDetailPage,
      meta: { title: 'Detail Beban' },
    },
    {
      path: '/stok',
      name: 'stock',
      component: StockPage,
      meta: { title: 'Stok' },
    },
    {
      path: '/stok/expiry',
      name: 'stock-expiry',
      component: ExpiryPage,
      meta: { title: 'Expiry & Lot' },
    },
    {
      path: '/stok/produk/:id',
      name: 'stock-detail',
      component: StockDetailPage,
      meta: { title: 'Kartu Stok' },
    },
    {
      path: '/stok/writeoff',
      name: 'stock-writeoffs',
      component: WriteoffsPage,
      meta: { title: 'Write-off' },
    },
    {
      path: '/stok/writeoff/baru',
      name: 'stock-writeoff-create',
      component: WriteoffsPage,
      meta: { title: 'Buat Write-off' },
    },
    {
      path: '/stok/writeoff/:id/ubah',
      name: 'stock-writeoff-edit',
      component: WriteoffsPage,
      meta: { title: 'Ubah Draft Write-off' },
    },
    {
      path: '/stok/writeoff/:id',
      name: 'stock-writeoff-detail',
      component: WriteoffsPage,
      meta: { title: 'Detail Write-off' },
    },
    {
      path: '/stok/opname',
      name: 'stocktakes',
      component: StocktakesPage,
      meta: { title: 'Stok Opname' },
    },
    {
      path: '/stok/opname/baru',
      name: 'stocktake-create',
      component: StocktakesPage,
      meta: { title: 'Buat Sesi Opname' },
    },
    {
      path: '/stok/opname/:id/ubah',
      name: 'stocktake-edit',
      component: StocktakesPage,
      meta: { title: 'Ubah Draft Opname' },
    },
    {
      path: '/stok/opname/:id',
      name: 'stocktake-detail',
      component: StocktakesPage,
      meta: { title: 'Detail Opname' },
    },
    {
      path: '/laporan',
      name: 'reports',
      component: ReportsPage,
      meta: { title: 'Laporan' },
    },
    {
      path: '/lainnya',
      name: 'more',
      component: MorePage,
      meta: { title: 'Lainnya' },
    },
    {
      path: '/lainnya/kamus-istilah',
      name: 'glossary',
      component: GlossaryPage,
      meta: { title: 'Kamus Istilah' },
    },
    {
      path: '/lainnya/panduan',
      name: 'user-guide',
      component: UserGuidePage,
      meta: { title: 'Panduan Pengguna' },
    },
    {
      path: '/lainnya/uat',
      name: 'uat',
      component: UatPage,
      meta: { title: 'UAT & Sign-off' },
    },
    {
      path: '/master',
      name: 'master',
      component: MasterHubPage,
      meta: { title: 'Master data' },
    },
    {
      path: '/master/produk',
      name: 'master-products',
      component: ProductsPage,
      meta: { title: 'Produk' },
    },
    {
      path: '/master/produk/baru',
      name: 'master-product-create',
      component: ProductFormPage,
      meta: { title: 'Tambah Produk' },
    },
    {
      path: '/master/produk/:id',
      name: 'master-product-edit',
      component: ProductFormPage,
      meta: { title: 'Edit Produk' },
    },
    {
      path: '/master/kategori',
      name: 'master-categories',
      component: CategoriesPage,
      meta: { title: 'Kategori Produk' },
    },
    {
      path: '/master/satuan',
      name: 'master-units',
      component: UnitsPage,
      meta: { title: 'Satuan Global' },
    },
    {
      path: '/master/supplier',
      name: 'master-suppliers',
      component: SuppliersPage,
      meta: { title: 'Supplier' },
    },
    {
      path: '/master/pelanggan',
      name: 'master-customers',
      component: CustomersPage,
      meta: { title: 'Pelanggan' },
    },
    {
      path: '/master/kategori-beban',
      name: 'master-expense-categories',
      component: ExpenseCategoriesPage,
      meta: { title: 'Kategori Beban' },
    },
    {
      path: '/pengaturan',
      name: 'settings',
      component: SettingsHubPage,
      meta: { title: 'Pengaturan' },
    },
    {
      path: '/pengaturan/profil',
      name: 'settings-profile',
      component: ProfileSettingsPage,
      meta: { title: 'Profil Usaha' },
    },
    {
      path: '/pengaturan/penomoran',
      name: 'settings-numbering',
      component: NumberingSettingsPage,
      meta: { title: 'Penomoran & Default' },
    },
    {
      path: '/pengaturan/keamanan',
      name: 'settings-security',
      component: SecuritySettingsPage,
      meta: { title: 'Keamanan' },
    },
    {
      path: '/pengaturan/backup',
      name: 'settings-backup',
      component: BackupSettingsPage,
      meta: { title: 'Backup' },
    },
    {
      path: '/pengaturan/restore',
      name: 'settings-restore',
      component: RestoreSettingsPage,
      meta: { title: 'Restore' },
    },
    {
      path: '/pengaturan/migrasi',
      name: 'settings-migration',
      component: () => import('@/features/migration/MigrationPage.vue'),
      meta: { title: 'Migrasi Laravel' },
    },
    {
      path: '/pengaturan/storage',
      name: 'settings-storage',
      component: StorageSettingsPage,
      meta: { title: 'Storage' },
    },
    {
      path: '/pengaturan/aplikasi',
      name: 'settings-app',
      component: PwaSettingsPage,
      meta: { title: 'Aplikasi & Offline' },
    },
    {
      path: '/pengaturan/tentang',
      name: 'settings-about',
      component: AboutPage,
      meta: { title: 'Tentang' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'StokPlus'
  document.title = `${title} · StokPlus`
})

export default router
