# Domain

Folder ini disiapkan untuk aturan bisnis murni yang tidak bergantung pada Vue atau Dexie.

Contoh aturan yang relevan:

- konversi unit dan qty base,
- alokasi FEFO/FIFO,
- perhitungan HPP/COGS,
- aturan pembatalan dan restore lot,
- formula laba kotor/bersih,
- validasi opname dan write-off.

Aturan yang sudah berjalan berada di `src/master/validation.ts`, `src/purchases/validation.ts`,
dan `src/sales/validation.ts` karena masih dekat dengan repository masing-masing. Folder ini
disiapkan untuk aturan murni yang nantinya dipakai lintas fitur agar tidak bergantung pada Vue atau
Dexie.
