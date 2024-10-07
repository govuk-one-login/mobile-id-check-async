// import { errorResult, Result, successResult } from "../../../utils/result";
// import {IDataStore, SessionDetails, SessionId} from "../datastore";
//
// export class MockDynamoDbAdapterReadSessionIdErrorResult
//   implements IDataStore
// {
//   readonly tableName: string;
//
//   constructor(tableName: string) {
//     this.tableName = tableName;
//   }
//
//   readSessionId = async (): Promise<Result<SessionId | null>> => {
//     return errorResult({
//       errorMessage: "Mock error",
//       errorCategory: "SERVER_ERROR",
//     });
//   };
//
//   readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
//     return successResult(null);
//   };
//
//   create = async (): Promise<Result<string>> => {
//     return successResult("mockSessionId");
//   };
// }
//
// export class MockDynamoDbAdapterReadSessionIdNotFoundSuccessResult
//   implements IDataStore
// {
//   readonly tableName: string;
//
//   constructor(tableName: string) {
//     this.tableName = tableName;
//   }
//
//   readSessionId = async (): Promise<Result<SessionId | null>> => {
//     return successResult(null);
//   };
//
//   readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
//     return successResult(null);
//   };
//
//   create = async (): Promise<Result<string>> => {
//     return successResult("mockSessionId");
//   };
// }
//
// export class MockDynamoDbAdapterReadSessionIdSuccessResult
//   implements IDataStore
// {
//   readonly tableName: string;
//
//   constructor(tableName: string) {
//     this.tableName = tableName;
//   }
//
//   readSessionId = async (): Promise<Result<SessionId | null>> => {
//     return successResult("mockSessionId");
//   };
//
//   readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
//     return successResult(null);
//   };
//
//   create = async (): Promise<Result<string>> => {
//     return successResult("mockSessionId");
//   };
// }
