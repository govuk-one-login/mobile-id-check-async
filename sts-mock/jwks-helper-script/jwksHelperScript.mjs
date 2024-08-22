import { exportJWK, generateKeyPair } from "jose";
import { writeFileSync } from "fs";
import { randomUUID } from "node:crypto";

const privateKeyFileName = process.argv[2];
const jwksFileName = process.argv[3];

const keyPair = await generateKeyPair("ES256", {
    extractable: true,
});

const privateKey = await exportJWK(keyPair.privateKey);
writeFileSync(privateKeyFileName, JSON.stringify(privateKey), "utf8");

const publicKey = await exportJWK(keyPair.publicKey);
const jwks = {
    keys: [
        {
            ...publicKey,
            kid: randomUUID(),
            use: "sig",
            alg: "ES256",
        },
    ],
};
writeFileSync(jwksFileName, JSON.stringify(jwks), "utf8");