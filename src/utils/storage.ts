export interface StorageInfo {
  supported: boolean
  usage: number
  quota: number
  percent: number
  persisted: boolean
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      percent: 0,
      persisted: false,
    }
  }

  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage ?? 0
  const quota = estimate.quota ?? 0
  const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false

  return {
    supported: true,
    usage,
    quota,
    percent: quota > 0 ? Math.min(100, (usage / quota) * 100) : 0,
    persisted,
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false
  }

  return navigator.storage.persist()
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent

  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: exponent === 0 ? 0 : 1,
  }).format(value)} ${units[exponent]}`
}
