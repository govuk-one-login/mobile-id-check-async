import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'jwk'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'jwk'
    }
})

console.log(privateKey, publicKey)
