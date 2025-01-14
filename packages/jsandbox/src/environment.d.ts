/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Encodes a text string as a valid component of a Uniform Resource Identifier (URI).
 * @param uriComponent A value representing an unencoded URI component.
 */
declare function encodeURIComponent(
  uriComponent: string | number | boolean
): string;

interface Console {
  log(...data: any[]);
  error(...data: any[]);
  warn(...data: any[]);
}

declare var console: Console;

declare module "@fetch" {
  export type FetchInputs = {
    $metadata?: {
      title?: string;
      description?: string;
    };
    /**
     * The URL to fetch
     */
    url: string;
    /**
     * The HTTP method to use. "GET is default.
     */
    method?: "GET" | "POST" | "PUT" | "DELETE";
    /**
     * Headers to send with request
     */
    headers?: Record<string, string>;
    /**
     * The body of the request
     */
    body?: unknown;
  };

  export type FetchOutputs = {
    /**
     * The error object.
     */
    $error?: unknown;
    /**
     * The response from the fetch request
     */
    response: unknown;
    /**
     * The HTTP status code of the response
     */
    status: number;
    /**
     * The status text of the response
     */
    statusText: string;
    /**
     * The content type of the response
     */
    contentType: string;
    /**
     * The headers of the response
     */
    responseHeaders: Record<string, string>;
  };

  /**
   * A built-in capability of Breadboard to fetch data.
   */
  export default function fetch(url: FetchInputs): Promise<FetchOutputs>;
}

declare module "@secrets" {
  /**
   * A built-in capability of Breadboard to obtain secrets.
   */
  export default function secrets<S extends string>(inputs: {
    $metadata?: {
      title?: string;
      description?: string;
    };
    keys: S[];
  }): Promise<{ [K in S]: string }>;
}

declare module "@invoke" {
  export type InvokeInputs = {
    $metadata?: {
      title?: string;
      description?: string;
    };
    $board?: string;
    $start?: string;
    $stopAfter?: string;
  } & Record<string, unknown>;

  export type InvokeOutputs = Record<string, unknown> & {
    $error?: unknown;
  };

  /**
   * A built-in capability of Breadboard to invoke boards.
   */
  export default function invoke(inputs: InvokeInputs): Promise<InvokeOutputs>;
}

declare module "@output" {
  export type OutputInputs = {
    $metadata?: {
      title?: string;
      description?: string;
    };
    schema?: Schema;
  } & Record<string, unknown>;

  export type OutputOutputs = {
    delivered: boolean;
  };

  export default function output(inputs: OutputInputs): Promise<OutputOutputs>;
}

declare module "@describe" {
  export type DescribeInputs = {
    url: string;
    inputs?: Values;
    inputSchema?: Schema;
    outputSchema?: Schema;
  };

  export type DescribeOutputs = {
    $error?: string;
    title?: string;
    description?: string;
    metadata?: {
      icon?: string;
      tags?: string[];
      help?: {
        description?: string;
        url: string;
      };
    };
    inputSchema: Schema;
    outputSchema: Schema;
  };

  export default function describe(
    inputs: DescribeInputs
  ): Promise<DescribeOutputs>;
}

declare type FunctionCallCapabilityPart = {
  functionCall: {
    name: string;
    args: object;
  };
};

declare type FunctionResponseCapabilityPart = {
  functionResponse: {
    name: string;
    response: object;
  };
};

declare type TextCapabilityPart = {
  text: string;
};

declare type DataStoreHandle = string;

/**
 * Represents data that is stored by a DataStoreProvider.
 */
declare type StoredDataCapabilityPart = {
  storedData: {
    handle: DataStoreHandle;
    mimeType: string;
  };
};

declare type DataPart =
  | InlineDataCapabilityPart
  | StoredDataCapabilityPart
  | FunctionCallCapabilityPart
  | FunctionResponseCapabilityPart
  | TextCapabilityPart;

declare type LLMContent = {
  role?: string;
  parts: DataPart[];
};

/**
 * Represents inline data, encoded as a base64 string.
 */
declare type InlineDataCapabilityPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

declare type BehaviorSchema =
  /**
   * This port is deprecated and is only there because there might be graphs
   * that still use it. Don't show it in the UI unless there are existing
   * incoming wires.
   */
  | "deprecated"
  /**
   * Indicates that this particular input port value should not be cached by
   * the input bubbling machinery.
   * Use this when you'd like to continually ask the user for the same input,
   * rather that re-using cached answer (default behavior).
   */
  | "transient"
  /**
   * Indicates that the output node should bubble up to the invoking runner,
   * if any.
   * This is useful for sending outputs to the user from inside of the nested
   * graphs.
   */
  | "bubble"
  /**
   * Indicates that the input our output port is a "BoardCapability".
   */
  | "board"
  /**
   * Indicates that the input or output port is a "StreamCapability".
   */
  | "stream"
  /**
   * Indicates that the input or output port is an "ErrorCapability".
   */
  | "error"
  /**
   * Indicates that the input port is usually configured, rather than wired in.
   */
  | "config"
  /**
   * Indicates that the input or output port represents base structured
   * datatype containing multi-part content of a message, generated by an LLM.
   * See [Content](https://ai.google.dev/api/rest/v1beta/Content) for details
   * on the datatype.
   */
  | "llm-content"
  /**
   * Indicates that the input or output port represents a JSON schema.
   */
  | "json-schema"
  /**
   * Indicates that the input or output port represents a JSON schema that
   * describes an input or output port.
   */
  | "ports-spec"
  /**
   * Indicates that the input or output port represents an image. The image can
   * be a URL or a base64 encoded image.
   */
  | "image"
  /**
   * Indicates that the input or output represents some sort of code
   */
  | "code"
  /**
   * Indicates that the string is a Google Drive Query. See
   * https://developers.google.com/drive/api/guides/search-files.
   */
  | "google-drive-query"
  /**
   * Indicates that the string is a Google Drive File ID.
   * https://developers.google.com/drive/api/guides/about-files#characteristics
   */
  | "google-drive-file-id"
  /**
   * Indicates that the string is a Module.
   */
  | "module"
  /**
   * Indicates that this is a side wire
   * See https://github.com/breadboard-ai/breadboard/issues/3788#issuecomment-2477813443
   */
  | "side";

declare type Schema = {
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  format?: string;
  /**
   * Can be used to provide additional hints to the UI or to other parts of
   * the system about behavior of this particular input/output or input/output
   * port.
   */
  behavior?: BehaviorSchema[];
  transient?: boolean;
  enum?: string[];
  /**
   * The default value of the schema. The UI can use this to pre-populate a
   * field with a value, if there is no "examples" present.
   */
  default?: string;
  additionalProperties?: boolean | Schema;
  items?: Schema | Schema[];
  minItems?: number;
  /**
   * Can be used by UI to pre-populate a field with a value that could be
   * used as an example.
   */
  examples?: string[];
};
