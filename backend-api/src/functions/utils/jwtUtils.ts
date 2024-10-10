import jose from "node-jose";

export const jwtUtils = {

    // convert non-base64 string or uint8array into base64 encoded string
    base64Encode: function (value: string | Uint8Array): string {
        return jose.util.base64url.encode(Buffer.from(value), 'utf8')
    },

    // convert base64 into uint8array
    base64DecodeToUint8Array: function (value: string): Uint8Array {
        return new Uint8Array(jose.util.base64url.decode(value))
    },

    // convert uint8array into base64
    Uint8ArrayEncodeToBase64: function (value: Uint8Array): string {
        return Buffer.from(value).toString('base64url')
    },

    // convert base64 encoded string into non-base64 string
    base64DecodeToString: function (value: string): string {
        return Buffer.from(value, 'base64url').toString()
    },

    // convert uint8array into string
    decode: function (value: Uint8Array): string {
        const decoder = new TextDecoder()
        return decoder.decode(value)
    },

    // convert string into uint8array
    encode: function (value: string): Uint8Array {
        const encoder = new TextEncoder()
        return encoder.encode(value)
    }
}