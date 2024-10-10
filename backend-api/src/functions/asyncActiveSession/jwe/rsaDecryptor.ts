import { KMSAdapter } from '../../adapters/kmsAdapter'

export class RsaDecryptor implements IDecryptAsymmetric {
    private readonly kmsAdapter

    constructor (kmsAdapter: KMSAdapter) {
        this.kmsAdapter = kmsAdapter
    }

    async decrypt (encryptedCek: Uint8Array): Promise<Uint8Array> {
        return await this.kmsAdapter.decrypt(encryptedCek)
    }
}

export interface IDecryptAsymmetric {
    decrypt: (cek: Uint8Array) => Promise<Uint8Array>
}