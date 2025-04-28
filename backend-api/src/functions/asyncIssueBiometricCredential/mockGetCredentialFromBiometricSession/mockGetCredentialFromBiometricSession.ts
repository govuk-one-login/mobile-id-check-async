import { successResult } from "../../utils/result";
import { IGetCredentialFromBiometricSession } from "./types";

export const mockGetCredentialFromBiometricSession: IGetCredentialFromBiometricSession =
  (_vendorResponse, _fraudCheckData, _options) => {
    return successResult({
      credential: "mockCredential",
      advisories: "mockAdvisories",
      audit: "mockAudit",
      analytics: "mockAnalytics",
    });
  };
