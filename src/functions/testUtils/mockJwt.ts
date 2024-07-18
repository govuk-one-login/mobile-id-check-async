import jose from "node-jose";

interface mockJwt {
  header: {
    alg: string;
    type: string;
  };
  payload: {
    nbf?: number;
    exp?: number;
    iat?: number;
    iss?: string;
    scope?: string;
    client_id?: string;
    aud?: string;
  };
  signature: string;
}

export class MockJWTBuilder {
  private jwt: mockJwt = {
    header: { alg: "HS256", type: "JWT" },
    payload: {
      exp: Date.now() + 1000,
      iss: "mockIssuer",
      aud: "mockIssuer",
      scope: "dcmaw.session.async_create",
      client_id: "mockClientId",
    },
    signature: "Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
  };

  setAud = (aud: string): this => {
    this.jwt.payload.aud = aud;
    return this;
  };

  deleteAud = (): this => {
    delete this.jwt.payload.aud;
    return this;
  };

  setNbf = (nbf: number): this => {
    this.jwt.payload.nbf = nbf;
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

  setScope = (scope: string): this => {
    this.jwt.payload.scope = scope;
    return this;
  };

  deleteScope = (): this => {
    delete this.jwt.payload.scope;
    return this;
  };

  setClientId = (clientId: string): this => {
    this.jwt.payload.client_id = clientId;
    return this;
  };

  deleteClientId = (): this => {
    delete this.jwt.payload.client_id;
    return this;
  };

  getEncodedJwt = () => {
    const header = jose.util.base64url.encode(
      Buffer.from(JSON.stringify(this.jwt.header)),
      "utf8",
    );
    const payload = jose.util.base64url.encode(
      Buffer.from(JSON.stringify(this.jwt.payload)),
      "utf8",
    );
    return `${header}.${payload}.${this.jwt.signature}`;
  };
}
