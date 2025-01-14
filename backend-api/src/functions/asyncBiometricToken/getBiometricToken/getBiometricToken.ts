import { Result, successResult } from "../../utils/result"

export type IGetBiometricToken = (url: string, submitterKey: string) => Promise<Result<string, void>>

export const getBiometricToken: IGetBiometricToken = async () => {
  return successResult('mockBiometricToken')
}
