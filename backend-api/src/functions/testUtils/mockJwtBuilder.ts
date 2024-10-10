import { SignJWT } from "jose";

const mockSecret = "mockSecret";

export class MockJWTBuilder {
  private jwt: IMockJwt;

  constructor() {
    this.jwt = {
      header: {
        alg: "HS256",
        type: "JWT",
        kid: "mockKid",
      },
      payload: {
        exp: Date.now() + 1000,
        iss: "mockIssuer",
        aud: "mockIssuer",
        scope: "dcmaw.session.async_create",
        client_id: "mockClientId",
      },
      signature: "",
    };
  }

  setHeader(headerOverrides: IMockJwtHeader) {
    this.jwt.header = { ...this.jwt.header, ...headerOverrides };
    return this;
  }

  setPayload(payloadOverrides: IMockJwtPayload) {
    this.jwt.payload = { ...this.jwt.payload, ...payloadOverrides };
    return this;
  }

  deleteHeaderValue(value: keyof IMockJwtHeader) {
    delete this.jwt.header[value];
    return this;
  }

  deletePayloadValue(value: keyof IMockJwtPayload) {
    delete this.jwt.payload[value];
    return this;
  }

  async buildEncodedJwt() {
    const secret = new TextEncoder().encode(mockSecret);
    const encodedJwt = await new SignJWT({ ...this.jwt.payload })
      .setProtectedHeader({ ...this.jwt.header })
      .sign(secret);

    return encodedJwt;
  }
}

interface IMockJwt {
  header: IMockJwtHeader;
  payload: IMockJwtPayload;
  signature: string;
}

interface IMockJwtHeader {
  alg: string;
  type: string;
  kid?: string;
}

interface IMockJwtPayload {
  nbf?: number;
  exp?: number;
  iat?: number;
  iss?: string;
  scope?: string;
  client_id?: string;
  aud?: string;
}
