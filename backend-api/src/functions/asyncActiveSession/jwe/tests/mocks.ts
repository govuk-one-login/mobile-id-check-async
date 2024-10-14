import { IDecryptSymmetric } from "../symmetricDecrypter";
import { IDecryptJwe } from "../jweDecrypter";
import { errorResult, Result, successResult } from "../../../utils/result";

export class MockJweDecrypterSuccess implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return Promise.resolve(successResult("header.payload.signature"));
  }
}

export class MockJweDecrypterFailure implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Some mock decryption error",
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
