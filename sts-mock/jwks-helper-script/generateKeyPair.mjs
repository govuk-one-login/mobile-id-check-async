/*
Script for generating an asymmetric key pair and writing the keys to the file system.
It saves the private key (as a JSON Web Key) and the public key (as a JSON Web Key Set) separately.
*/

import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";
import { writeFileSync } from "fs";

const privateKeyJwkFileName = process.argv[2];
const publicKeyJwksFileName = process.argv[3];

const keyPair = await generateKeyPair("ES256", {
    extractable: true,
});

// Private key as JSON Web Key (JWK)
let privateKey = await exportJWK(keyPair.privateKey);
const keyId = await calculateJwkThumbprint(privateKey)
privateKey.kid = keyId;

const publicKey = await exportJWK(keyPair.publicKey);

// Public key as JSON Web Key Set (JWKS)
const publicKeyJwks = {
    keys: [
        {
            ...publicKey,
            kid: keyId,
            use: "sig",
            alg: "ES256",
        },
    ],
};

writeFileSync(privateKeyJwkFileName, JSON.stringify(privateKey), "utf8");
writeFileSync(publicKeyJwksFileName, JSON.stringify(publicKeyJwks), "utf8");