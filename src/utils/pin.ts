import { base64ToBytes, bytesToBase64 } from '@/utils/base64'

export const PIN_LENGTH = 6
export const PBKDF2_ITERATIONS = 210_000

const KEY_LENGTH_BITS = 256

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

export function generatePinSalt(): string {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return bytesToBase64(salt)
}

export async function hashPin(
  pin: string,
  salt: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(salt) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  )

  return bytesToBase64(new Uint8Array(bits))
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<boolean> {
  if (!isValidPin(pin) || !salt || !expectedHash) {
    return false
  }

  const actualHash = await hashPin(pin, salt, iterations)
  return constantTimeEqual(actualHash, expectedHash)
}
