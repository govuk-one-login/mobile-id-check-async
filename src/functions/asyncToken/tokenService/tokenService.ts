import { KMSClient, SignCommand } from "@aws-sdk/client-kms"
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import { Buffer } from 'buffer'
import jose from 'node-jose'
import format from 'ecdsa-sig-formatter'

export class TokenService implements IMintToken {
  readonly kidArn: string
  private kmsClient = new KMSClient([{
    region: 'eu-west-2',
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 29000,
      requestTimeout: 29000
    })
  }])

  constructor (kidArn: string) {
    this.kidArn = kidArn
  }

  async mintToken (jwtPayload: IJwtPayload): Promise<string> {
    // Building token
    const jwtHeader: JwtHeader = { alg: 'ES256', typ: 'JWT' }
    const kid = this.kidArn.split('/').pop()
    if (kid != null) {
      jwtHeader.kid = kid
    }

    const tokenComponents = {
      header: this.base64Encode(JSON.stringify(jwtHeader)),
      payload: this.base64Encode(JSON.stringify(jwtPayload)),
      signature: ''
    }

    const unsignedToken = `${tokenComponents.header}.${tokenComponents.payload}.`

    // Signing token
    const command = new SignCommand({
      Message: Buffer.from(unsignedToken),
      KeyId: this.kidArn,
      SigningAlgorithm: "ECDSA_SHA_256",
      MessageType: "RAW",
    })


    const result = await this.kmsClient.send(command)

    if (!result.Signature) {
      throw new Error('Failed to sign JWT with signature')
    }

    // Convert signature to buffer and format with ES256 algorithm
    const signatureBuffer = Buffer.from(result.Signature)
    tokenComponents.signature = format.derToJose(signatureBuffer, 'ES256')

    return `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`
  }

  // convert non-base64 string or uint8array into base64 encoded string
  private base64Encode (value: string | Uint8Array): string {
    return jose.util.base64url.encode(Buffer.from(value), 'utf8')
  }
}

export interface IJwtPayload {
  [key: string]: string | number | undefined
  iss: string
  aud: string
  scope: string
  exp: number
  client_id: string
  nbf?: number
  iat?: number
}

export interface JwtHeader {
  alg: Algorithm | string
  typ: string
  kid?: string
}

export interface IMintToken {
  mintToken: (jwtPayload: IJwtPayload) => Promise<string>
}