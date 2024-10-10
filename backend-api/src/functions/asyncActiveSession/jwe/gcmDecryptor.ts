import crypto from 'crypto'

export class GcmDecryptor implements IDecryptSymmetric {
  async decrypt (key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array, additionalData: Uint8Array): Promise<Uint8Array> {
    const webcrypto = crypto.webcrypto as unknown as Crypto
    const cek = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt'])
    const decryptedBuffer = await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData,
        tagLength: 128
      },
      cek,
      Buffer.concat([new Uint8Array(ciphertext), new Uint8Array(tag)])
    )

    return new Uint8Array(decryptedBuffer)
  }
}

export interface IDecryptSymmetric {
    decrypt: (key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array, additionalData: Uint8Array) => Promise<Uint8Array>
}