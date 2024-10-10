import { IDecryptAsymmetric } from "../kmsAdapter";

export class MockAsymmetricDecrypterSuccess implements IDecryptAsymmetric {
  async decrypt(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }
}

export class MockAsymmetricDecrypterFailure implements IDecryptAsymmetric {
  async decrypt(): Promise<Uint8Array> {
    return Promise.reject("Some mock asymmetric decryption error");
  }
}
