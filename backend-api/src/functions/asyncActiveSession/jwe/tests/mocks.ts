import { IDecryptSymmetric } from "../symmetricDecrypter";
import { IDecryptJwe } from "../jweDecrypter";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";

export class MockJweDecrypterSuccess implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return Promise.resolve(successResult("header.payload.signature"));
  }
}

export class MockJweDecrypterServerError implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Some mock decryption server error",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }
}

export class MockJweDecrypterClientError implements IDecryptJwe {
  async decrypt(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Some mock decryption client error",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }
}

export class MockSymmetricDecrypterSuccess implements IDecryptSymmetric {
  decrypt(): string {
    return "header.payload.signature";
  }
}

export class MockSymmetricDecrypterFailure implements IDecryptSymmetric {
  decrypt(): string {
    throw new Error("Some mock symmetric decryption error");
  }
}
