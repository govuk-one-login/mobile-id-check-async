import { base64url, importJWK, SignJWT } from "jose";

export class MockJWTBuilder {
  private jwt: IMockJwt = {
    header: { alg: "ES256", typ: "JWT", kid: "mockKid" },
    payload: {
      exp: Date.now() + 1000,
      iss: "mockIssuer",
      aud: "mockAudience",
      scope: "dcmaw.session.async_create",
      client_id: "mockClientId",
    },
    signature: "Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
  };

  deleteKid = (): this => {
    delete this.jwt.header.kid;
    return this;
  };

  setAud = (aud: string): this => {
    this.jwt.payload.aud = aud;
    return this;
  };

  deleteAud = (): this => {
    delete this.jwt.payload.aud;
    return this;
  };

  deleteClientId = (): this => {
    delete this.jwt.payload.client_id;
    return this;
  };

  deleteExp = (): this => {
    delete this.jwt.payload.exp;
    return this;
  };

  setExp = (exp: number): this => {
    this.jwt.payload.exp = exp;
    return this;
  };

  setIat = (iat: number): this => {
    this.jwt.payload.iat = iat;
    return this;
  };

  setIss = (iss: string): this => {
    this.jwt.payload.iss = iss;
    return this;
  };

  deleteIss = (): this => {
    delete this.jwt.payload.iss;
    return this;
  };

  setNbf = (nbf: number): this => {
    this.jwt.payload.nbf = nbf;
    return this;
  };

  setScope = (scope: string): this => {
    this.jwt.payload.scope = scope;
    return this;
  };

  deleteScope = (): this => {
    delete this.jwt.payload.scope;
    return this;
  };

  setSub = (sub: string): this => {
    this.jwt.payload.sub = sub;
    return this;
  };

  getSignedEncodedJwt = async (
    privateKey: IMockPrivateKey = MOCK_SIGNING_KEY,
  ) => {
    const signingKey = await importJWK(privateKey);
    return await new SignJWT(this.jwt.payload)
      .setProtectedHeader(this.jwt.header)
      .sign(signingKey);
  };

  getEncodedJwt = () => {
    const header = base64url.encode(JSON.stringify(this.jwt.header));

    const payload = base64url.encode(JSON.stringify(this.jwt.payload));

    return `${header}.${payload}.${this.jwt.signature}`;
  };
}

// Signing key used in unit tests only
const MOCK_SIGNING_KEY = {
  crv: "P-256",
  d: "IMeUPld6UA1WUKJF34HDwZGT2tArxZslpl_dVYzOLKU",
  kid: "sThKMT3oxcTXG-sgMw2EVPTE9Y8W43wLXfqu7zT46-w",
  kty: "EC",
  x: "YMoiJArVzO9RIVR7J9mUlGixqWyXCAYrZLtdc8EhuO8",
  y: "47JYyUr0qlg3VksGlHCAdpwR_w1dixXfcTi7hBEfrRo",
};

interface IMockJwt {
  header: {
    alg: string;
    typ: string;
    kid?: string;
  };
  payload: {
    nbf?: number;
    exp?: number;
    iat?: number;
    iss?: string;
    scope?: string;
    client_id?: string;
    aud?: string;
    sub?: string;
  };
  signature: string;
}

interface IMockPrivateKey {
  crv: string;
  d: string;
  kid: string;
  kty: string;
  x: string;
  y: string;
}
