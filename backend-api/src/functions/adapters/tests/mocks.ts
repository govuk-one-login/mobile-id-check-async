import { ClientError, IGetPublicKey, IDecrypt } from "../kmsAdapter";

export class MockAsymmetricDecrypterSuccess implements IDecrypt {
  async decrypt(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }
}

export class MockAsymmetricDecrypterError implements IDecrypt {
  async decrypt(): Promise<Uint8Array> {
    return Promise.reject(new Error("Some mock asymmetric decryption error"));
  }
}

export class MockAsymmetricDecrypterClientError implements IDecrypt {
  async decrypt(): Promise<Uint8Array> {
    return Promise.reject(
      new ClientError("Some mock asymmetric decryption client error"),
    );
  }
}

export class MockGetPublicKeySuccess implements IGetPublicKey {
  async getPublicKey(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }
}

export class MockGetPublicKeyError implements IGetPublicKey {
  async getPublicKey(): Promise<Uint8Array> {
    return Promise.reject(new Error("Some mock asymmetric decryption error"));
  }
}
