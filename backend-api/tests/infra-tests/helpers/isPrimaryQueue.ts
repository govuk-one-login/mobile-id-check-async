export const isPrimaryQueue = (queueName: string): boolean => {
  const lowerCaseName = queueName.toLowerCase();
  return (
    !lowerCaseName.includes("deadletterqueue") && !lowerCaseName.includes("dlq")
  );
};
