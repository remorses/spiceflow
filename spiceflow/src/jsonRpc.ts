// https://www.jsonrpc.org/specification

export type JsonRpcRequestId = string | number | null;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: JsonValue[];
  meta?: any
  id: JsonRpcRequestId;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  result: JsonValue;
  error?: undefined;
  id: JsonRpcRequestId;
  meta?: any;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  result?: undefined;
  error: JsonRpcError;
  id: JsonRpcRequestId;
  meta?: any;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
