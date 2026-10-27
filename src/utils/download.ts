export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json',
): number {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1_000)

  return blob.size
}
