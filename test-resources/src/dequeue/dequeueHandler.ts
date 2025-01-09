import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  PutRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { Logger } from "../services/logging/logger";
import { MessageName, registeredLogs } from "./registeredLogs";

export const lambdaHandlerConstructor = async (
  dependencies: IDequeueDependencies,
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  const { env } = dependencies;
  const logger = dependencies.logger();
  logger.addContext(context);
  logger.log("STARTED");

  const records = event.Records;
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const processedMessages: PutRequest[] = [];

  if (!env.EVENTS_TABLE_NAME) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: "Missing environment variable: EVENTS_TABLE_NAME",
    });
    return { batchItemFailures };
  }
  if (!env.TXMA_EVENT_TTL_DURATION_IN_SECONDS) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage:
        "Missing environment variable: TXMA_EVENT_TTL_DURATION_IN_SECONDS",
    });
    return { batchItemFailures };
  }

  for (const record of records) {
    let txmaEvent: TxmaEvent;

    try {
      txmaEvent = JSON.parse(record.body);
    } catch {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Failed to process message - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    if (!txmaEvent.event_name) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Missing event_name - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    if (!allowedTxmaEventNames.includes(txmaEvent.event_name)) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `event_name not valid - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    if (!txmaEvent.user) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Missing user - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const { session_id } = txmaEvent.user;
    if (!session_id) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Missing session_id - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    if (!isValidUUID(session_id)) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `session_id not valid - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    if (!txmaEvent.timestamp) {
      logger.log("FAILED_TO_PROCESS_MESSAGES", {
        errorMessage: `Missing timestamp - messageId: ${record.messageId}`,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const timeToLiveInSeconds = getTimeToLiveInSeconds(
      env.TXMA_EVENT_TTL_DURATION_IN_SECONDS,
    );
    const putItemCommandInput: PutItemCommandInput = {
      TableName: env.EVENTS_TABLE_NAME,
      Item: marshall({
        pk: `TXMA#${txmaEvent.user.session_id}`,
        sk: `${txmaEvent.event_name}#${txmaEvent.timestamp}`,
        eventBody: record.body,
        timeToLiveInSeconds,
      }),
    };

    const command = new PutItemCommand(putItemCommandInput);
    try {
      await dbClient.send(command);
    } catch (error) {
      logger.log("ERROR_WRITING_EVENT_TO_EVENTS_TABLE", {
        errorMessage: error,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    processedMessages.push({ Item: putItemCommandInput.Item });
  }

  if (processedMessages.length > 0) {
    logger.log("PROCESSED_MESSAGES", { processedMessages });
  }

  logger.log("COMPLETED");

  return { batchItemFailures };
};

const dbClient = new DynamoDBClient({
  region: "eu-west-2",
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

function getTimeToLiveInSeconds(ttlDuration: string) {
  return Math.floor(Date.now() / 1000) + Number(ttlDuration);
}

const isValidUUID = (input: string): boolean => {
  const regexUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidUUID = regexUUID.test(input);
  return isValidUUID;
};

interface TxmaEvent {
  event_name: string;
  user: {
    session_id: string;
  };
  timestamp: number;
}

export interface IDequeueDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
}

const dependencies: IDequeueDependencies = {
  env: process.env,
  logger: () =>
    new Logger<MessageName>(
      new PowertoolsLogger({ serviceName: "Dequeue Function" }),
      registeredLogs,
    ),
};

export const lambdaHandler = lambdaHandlerConstructor.bind(null, dependencies);

export const allowedTxmaEventNames = [
  "DCMAW_ABORT_APP",
  "DCMAW_ABORT_WEB",
  "DCMAW_CRI_4XXERROR",
  "DCMAW_CRI_5XXERROR",
  "DCMAW_REDIRECT_SUCCESS",
  "DCMAW_REDIRECT_ABORT",
  "DCMAW_MISSING_CONTEXT_AFTER_ABORT",
  "DCMAW_MISSING_CONTEXT_AFTER_COMPLETION",
  "DCMAW_PASSPORT_SELECTED",
  "DCMAW_BRP_SELECTED",
  "DCMAW_DRIVING_LICENCE_SELECTED",
  "DCMAW_CRI_END",
  "DCMAW_CRI_ABORT",
  "DCMAW_APP_HANDOFF_START",
  "DCMAW_HYBRID_BILLING_STARTED",
  "DCMAW_IPROOV_BILLING_STARTED",
  "DCMAW_READID_NFC_BILLING_STARTED",
  "DCMAW_CRI_START",
  "DCMAW_APP_END",
  "AUTH_SESSION_TOO_OLD",
  "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION",
  "BIOMETRIC_SESSION_OPAQUEID_MISMATCH",
];
