import { Scenario } from "../../utils/apiTestHelpers";

function getResidencePermitExpiryGracePeriodInMonths(): number {
  const residencePermitExpiryGracePeriodInMonthsStr =
    process.env["EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS"];
  if (residencePermitExpiryGracePeriodInMonthsStr === undefined) {
    throw new Error(
      "EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS environment variable must be set",
    );
  }

  const residencePermitExpiryGracePeriodInMonths = Number(
    residencePermitExpiryGracePeriodInMonthsStr,
  );
  if (isNaN(residencePermitExpiryGracePeriodInMonths)) {
    throw new Error(
      "EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS must be a valid number",
    );
  }

  return residencePermitExpiryGracePeriodInMonths;
}

export const EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS =
  getResidencePermitExpiryGracePeriodInMonths();

export const residencePermitTestScenarios = [
  {
    documentType: "BRP",
    documentCode: "IR",
    scenario: { success: Scenario.BRP_SUCCESS, failure: Scenario.BRP_FAILURE },
  },
  {
    documentType: "BRC",
    documentCode: "CR",
    scenario: { success: Scenario.BRC_SUCCESS, failure: Scenario.BRC_FAILURE },
  },
];
