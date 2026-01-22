import {
  expectedEventDrivingLicenceExpiredBeyondGracePeriod,
  expectedEventDrivingLicenceExpiredInGracePeriod,
  expectedEventDrivingLicenceInDate, txmaEventDrivingLicenceExpiredBeyondGracePeriod,
  txmaEventDrivingLicenceExpiredInGracePeriod,
  txmaEventDrivingLicenceInDate
} from "./utils/apiTestData";


describe("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event with valid properties", () => {
    it("TxMA event written with an in-date driving licence doc type", () => {

      // have the expect assertion for the event name

      // Later we will assign actualEvent = getVcIssuedEventObject();
      const actualEvent = txmaEventDrivingLicenceInDate;

      expectTxmaEventWithValidProperties(
        actualEvent,
        expectedEventDrivingLicenceInDate,
      )
    })

    it("TxMA event written with an expired driving licence within the grace period doc type", () => {

      // have the expect assertion for the event name

      // Later we will assign actualEvent = getVcIssuedEventObject();
      const actualEvent = txmaEventDrivingLicenceExpiredInGracePeriod;

      expectTxmaEventWithValidProperties(
        actualEvent,
        expectedEventDrivingLicenceExpiredInGracePeriod,
      )
    })

    it("TxMA event written with an expired driving licence within the grace period doc type", () => {

      // have the expect assertion for the event name

      // Later we will assign actualEvent = getVcIssuedEventObject();
      const actualEvent = txmaEventDrivingLicenceExpiredBeyondGracePeriod;

      expectTxmaEventWithValidProperties(
        actualEvent,
        expectedEventDrivingLicenceExpiredBeyondGracePeriod,
      )
    })
  });

function expectTxmaEventWithValidProperties(
  actualEvent: Record<string, any>,
  schema: Record<string, any>,
) {
  expect(actualEvent).toMatchObject(schema);
}

// Right now this won't work to extract the event object because criTxmaEvents is required,
// so mocking using the txmaEvent object below

  // function getVcIssuedEventObject(): any {
  //   return criTxmaEvents.find(item =>
  //     item.event &&
  //     'event_name' in item.event &&
  //     item.event.event_name === "DCMAW_ASYNC_CRI_VC_ISSUED"
  //   );
  // }



