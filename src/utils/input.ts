/**
 * Memilih seluruh isi input angka saat fokus agar pengguna bisa langsung
 * mengetik nilai baru tanpa harus menghapus angka 0 terlebih dahulu.
 */
export function selectOnFocus(event: FocusEvent): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.type !== 'number' && target.type !== 'text') {
    return
  }

  requestAnimationFrame(() => {
    if (document.activeElement === target) {
      target.select()
    }
  })
}
