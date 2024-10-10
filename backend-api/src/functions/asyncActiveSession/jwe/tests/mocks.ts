import { IDecryptSymmetric } from "../symmetricDecryptor";
import { IDecryptJwe } from "../jweDecryptor";
import { errorResult, Result, successResult } from "../../../utils/result";

export class MockJweDecryptorSuccess implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return Promise.resolve(successResult("header.payload.signature"));
  }
}

export class MockJweDecryptorFailure implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Some decryption error",
      errorCategory: "SERVER_ERROR",
    });
  }
}

export class MockSymmetricDecrypterSuccess implements IDecryptSymmetric {
  async decrypt(): Promise<string> {
    return Promise.resolve("header.payload.signature");
  }
}

export class MockSymmetricDecrypterFailure implements IDecryptSymmetric {
  async decrypt(): Promise<string> {
    return Promise.reject("Some mock symmetric decryption error");
  }
}
