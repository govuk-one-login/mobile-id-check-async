import { ClientError, IKmsAdapter } from "../kmsAdapter";

export class MockAsymmetricDecrypterSuccess implements IKmsAdapter {
  async decrypt(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }
}

export class MockAsymmetricDecrypterError implements IKmsAdapter {
  async decrypt(): Promise<Uint8Array> {
    return Promise.reject(new Error("Some mock asymmetric decryption error"));
  }
}

export class MockAsymmetricDecrypterClientError implements IKmsAdapter {
  async decrypt(): Promise<Uint8Array> {
    return Promise.reject(
      new ClientError("Some mock asymmetric decryption client error"),
    );
  }
}
