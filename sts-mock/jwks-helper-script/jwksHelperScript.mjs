import {calculateJwkThumbprint, exportJWK, generateKeyPair} from "jose";
import { writeFileSync } from "fs";

const privateKeyFileName = process.argv[2];
const jwksFileName = process.argv[3];

const keyPair = await generateKeyPair("ES256", {
    extractable: true,
});

let privateKey = await exportJWK(keyPair.privateKey);
const thumbprint = await calculateJwkThumbprint(privateKey)
privateKey.kid = thumbprint;

const publicKey = await exportJWK(keyPair.publicKey);

const publicKeyJwks = {
    keys: [
        {
            ...publicKey,
            kid: thumbprint,
            use: "sig",
            alg: "ES256",
        },
    ],
};

writeFileSync(privateKeyFileName, JSON.stringify(privateKey), "utf8");
writeFileSync(jwksFileName, JSON.stringify(publicKeyJwks), "utf8");