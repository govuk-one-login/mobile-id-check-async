import { jwtUtils } from '../../utils/jwtUtils'
import {IDecryptSymmetric} from "./gcmDecryptor";
import {IDecryptAsymmetric} from "./rsaDecryptor";

export interface IDecryptJwe {
    decrypt: (serializedJwe: string) => Promise<string>
}

export class JweDecryptor implements IDecryptJwe {
    asymmetricDecryptor: IDecryptAsymmetric
    symmetricDecryptor: IDecryptSymmetric

    constructor (asymmetricDecryptor: IDecryptAsymmetric, symmetricDecryptor: IDecryptSymmetric) {
        this.asymmetricDecryptor = asymmetricDecryptor
        this.symmetricDecryptor = symmetricDecryptor
    }

    async decrypt (serializedJwe: string): Promise<string> {
        const jweComponents = serializedJwe.split('.')

        if (jweComponents.length !== 5) {
            throw new Error('Error decrypting JWE: Missing component')
        }

        const [
            protectedHeader,
            encryptedKey,
            iv,
            ciphertext,
            tag
        ] = jweComponents

        let cek: Uint8Array
        try {
            cek = await this.asymmetricDecryptor.decrypt(jwtUtils.base64DecodeToUint8Array(encryptedKey))
        } catch (err) {
            throw new Error('Error decrypting JWE: Unable to decrypt encryption key via KMS', err)
        }

        let payload: Uint8Array
        try {
            payload = await this.symmetricDecryptor.decrypt(
                cek,
                jwtUtils.base64DecodeToUint8Array(iv),
                jwtUtils.base64DecodeToUint8Array(ciphertext),
                jwtUtils.base64DecodeToUint8Array(tag),
                new Uint8Array(Buffer.from(protectedHeader)))
        } catch (err) {
            throw new Error('Error decrypting JWE: Unable to decrypt payload via Crypto', err)
        }

        try {
            return jwtUtils.decode(payload)
        } catch (err) {
            throw new Error('Error decrypting JWE: Unable to decode the decrypted payload', err)
        }
    }
}