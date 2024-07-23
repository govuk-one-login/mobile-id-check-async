export type EnvVars =
  | "SIGNING_KEY_ID"
  | "ISSUER"
  | "SESSION_TABLE_NAME"
  | "SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME"
  | "SESSION_TTL_IN_MS"
  | "REGION";

// Get static variables
export const validOrThrow = (
  processEnv: NodeJS.ProcessEnv,
  envVar: EnvVars,
): string => {
  const value = processEnv[envVar];
  if (value === "" || value === undefined) {
    throw new Error(`${envVar} environment variable not set`);
  }
  return value;
};
