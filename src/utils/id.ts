/**
 * UUID v7: 48-bit Unix timestamp (ms) + random. Dipakai sebagai primary key
 * agar urutan insert tetap dekat dengan urutan waktu.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const timestamp = Date.now()
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff

  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
