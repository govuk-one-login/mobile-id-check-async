const expectedEvent = {
  user: {
    user_id: "8cc76240-8007-4376-9cd1-e5a0b5c32ac6", // YES (sub)
    session_id: "63e37252-1c6e-4fcd-89b5-7a9303c19f28", // YES (sessionId)
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444", // yes
    transaction_id: "ee7a7c29-7a4a-4b48-888d-0c0360d3b850", // no
  },
  timestamp: 1768990682, // no
  event_timestamp_ms: 1768990682790, // no
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  component_id: "https://review-b-async.dev.account.gov.uk", // yes
  restricted: {
    name: [
      {
        nameParts: [
          // yes - array exists
          { type: "GivenName", value: "Joe" },
          { type: "GivenName", value: "Shmoe" },
          { type: "FamilyName", value: "Doe The Ball" },
        ],
      },
    ],
    birthDate: [{ value: "1985-02-08" }], // yes - 1 item is in the array
    deviceId: [{ value: "fb03ce33-6cb4-4b27-b428-f614eba26dd0" }], // no
    drivingPermit: [
      // yes - object is present
      {
        personalNumber: "DOE99802085J99FG",
        expiryDate: "2030-01-18", // yes - value is a string
        issueDate: "2022-05-29",
        issueNumber: null,
        issuedBy: "DVLA", // yes - exact match
        fullAddress: "WHATEVER STREET, WIRRAL, CH1 1AQ",
      },
    ],
    address: [
      // yes - array has one item
      {
        uprn: null,
        organisationName: null,
        subBuildingName: null,
        buildingNumber: null,
        buildingName: null,
        dependentStreetName: null,
        streetName: null,
        doubleDependentAddressLocality: null,
        dependentAddressLocality: null,
        addressLocality: null,
        postalCode: "CH1 1AQ",
        addressCountry: null,
      },
    ],
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        txn: "9930669c-c6c6-434b-b551-75fc5f081bcd",
        strengthScore: 3, // yes
        validityScore: 2, // yes
        activityHistoryScore: 1, //yes
        checkDetails: [
          {
            checkMethod: "vri",
            identityCheckPolicy: "published",
            activityFrom: "2022-05-29",
          },
          { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
        ],
        txmaContraIndicators: [],
      },
    ],
  },
};