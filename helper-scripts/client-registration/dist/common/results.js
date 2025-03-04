export const buildStackFailureResultFromError = (stackName, error) => {
    let reason = "Failed to delete " + stackName + ".";
    if (error instanceof Error) {
        reason = reason + " " + error.message;
    }
    return {
        stackName,
        status: "FAILURE",
        reason,
    };
};
