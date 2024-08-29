import { CustomResourceEventSender } from "../customResourceEventSender";
import { buildLambdaContext } from "../../../testUtils/mockContext";
import { buildCloudFormationCustomResourceEvent } from "../../../testUtils/mockCloudFormationCustomResourceEvent";

let mockFetch: jest.SpyInstance;

describe("Custom Resource Event Sender", () => {
  let customResourceEventSender: CustomResourceEventSender;

  beforeEach(() => {
    customResourceEventSender = new CustomResourceEventSender(
      buildCloudFormationCustomResourceEvent(),
      buildLambdaContext(),
    );
    mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
      } as Response),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given an error happens when trying to send the event", () => {
    it("Returns an error response", async () => {
      mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 500,
          ok: false,
        } as Response),
      );

      const sendEventResponse =
        await customResourceEventSender.sendEvent("SUCCESS");

      expect(sendEventResponse.isError).toBe(true);
      expect(sendEventResponse.value).toStrictEqual({
        errorMessage: "Error sending Custom Resource event",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given an unexpected network error happens when trying to send the event", () => {
    it("Returns an error response", async () => {
      mockFetch = jest.spyOn(global, "fetch").mockImplementationOnce(() => {
        throw new Error("Unexpected network error");
      });

      const sendEventResponse =
        await customResourceEventSender.sendEvent("SUCCESS");

      expect(sendEventResponse.isError).toBe(true);
      expect(sendEventResponse.value).toStrictEqual({
        errorMessage: "Unexpected network error sending Custom Resource event",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the event is sent successfully", () => {
    describe("When the outcome is 'SUCCESS'", () => {
      it("Sends status 'SUCCESS' in the request body and returns an empty success response", async () => {
        const sendEventResponse =
          await customResourceEventSender.sendEvent("SUCCESS");

        expect(sendEventResponse.isError).toBe(false);
        expect(sendEventResponse.value).toStrictEqual(null);
        expect(mockFetch).toHaveBeenCalledWith("mockResponseUrl", {
          body: '{"Status":"SUCCESS","Reason":"See the details in CloudWatch Log Stream: logStream","PhysicalResourceId":"logStream","StackId":"mockStackId","RequestId":"mockRequestId","LogicalResourceId":"mockLogicalResourceId","NoEcho":false}',
          method: "PUT",
        });
      });
    });

    describe("When the outcome is 'FAILED'", () => {
      it("Sends status 'FAILED' in the request body and returns an empty success response", async () => {
        const sendEventResponse =
          await customResourceEventSender.sendEvent("FAILED");

        expect(sendEventResponse.isError).toBe(false);
        expect(sendEventResponse.value).toStrictEqual(null);
        expect(mockFetch).toHaveBeenCalledWith("mockResponseUrl", {
          body: '{"Status":"FAILED","Reason":"See the details in CloudWatch Log Stream: logStream","PhysicalResourceId":"logStream","StackId":"mockStackId","RequestId":"mockRequestId","LogicalResourceId":"mockLogicalResourceId","NoEcho":false}',
          method: "PUT",
        });
      });
    });
  });
});
