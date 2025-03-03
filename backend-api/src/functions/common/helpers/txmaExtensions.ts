import { Extensions } from "../../services/events/types";

/**
 * Generates the TxMA extensions object containing only defined values
 * @param extensions The extensions data from the request
 * @returns An object with all defined extensions or undefined if none exist
 */
export const getTxMAExtensions = (extensions: Extensions) => {
  // Filter out any undefined values
  const validExtensions = Object.entries(extensions)
    .filter(([_, extensionValue]) => extensionValue !== undefined)
    .reduce(
      (resultObject, [extensionKey, extensionValue]) => ({
        ...resultObject,
        [extensionKey]: extensionValue,
      }),
      {},
    );

  // Return undefined if no extensions are present
  return Object.keys(validExtensions).length > 0 ? validExtensions : undefined;
};
