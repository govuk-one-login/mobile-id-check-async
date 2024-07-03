export type EnvVars = "SIGNING_KEY_IDS";

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
