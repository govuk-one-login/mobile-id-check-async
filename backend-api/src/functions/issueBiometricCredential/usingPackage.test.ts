import {
  BiometricCredentialWrapper,
  GetCredentialError,
  GetCredentialErrorCode,
  GetCredentialErrorType,
  getCredentialFromVendorBiometricResult,
  Result,
} from "@govuk-one-login/mobile-id-check-biometric-credential";

test("Using shared package", () => {
  const invalidInput = {};
  const result: Result<BiometricCredentialWrapper, GetCredentialError> =
    getCredentialFromVendorBiometricResult(
      invalidInput,
      {
        issuedOn: 0,
        opaqueId: "",
      },
      {
        enableBiometricResidenceCard: true,
        enableBiometricResidencePermit: true,
        enableDrivingLicence: true,
        enableNfcPassports: true,
        enableUtopiaTestDocuments: true,
      },
    );
  expect(result).toEqual({
    isError: true,
    error: {
      errorCode: GetCredentialErrorCode.BIOMETRIC_RESULT_NOT_VALID,
      errorType: GetCredentialErrorType.VENDOR_ERROR,
      data: expect.any(Object),
    },
  });
});
