// import { generateKeyPairSync } from "node:crypto";
import { generateKeyPair, exportJWK } from "jose";

// const { privateKey, publicKey } = generateKeyPairSync('ec', {
//     namedCurve: 'secp256r1', // Implementing options
//     publicKeyEncoding: {
//         type: 'spki',
//         format: 'jwk'
//     },
//     privateKeyEncoding: {
//         type: 'pkcs8',
//         format: 'jwk'
//     }
// })

const keyPair = await generateKeyPair('ES256', {
    extractable: true,
})
console.log(await exportJWK(keyPair.privateKey))
console.log(await exportJWK(keyPair.publicKey))