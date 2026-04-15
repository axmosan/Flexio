/**
 * AES-256 encryption for .flex files.
 * The key is hardcoded — purpose is to prevent casual extraction of bundled scripts,
 * not to provide cryptographic security.
 */
import CryptoJS from 'crypto-js'

const SECRET_KEY = 'Fl3x10-CEP-K3Y-2026-AES256-AbCdEfGhIjKl'

export function encrypt(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, SECRET_KEY).toString()
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function encryptBuffer(buffer: string): string {
  const wordArray = CryptoJS.enc.Base64.parse(buffer)
  return CryptoJS.AES.encrypt(wordArray, SECRET_KEY).toString()
}

export function decryptToBase64(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Base64)
}
