/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Capability,
  Edge,
  GraphDescriptor,
  InlineDataCapabilityPart,
  InputValues,
  KitDescriptor,
  NodeDescriptor,
  NodeIdentifier,
  NodeTypeIdentifier,
  NodeValue,
  OutputValues,
  StartLabel,
  StoredDataCapabilityPart,
} from "@breadboard-ai/types";
import { GraphLoader } from "./loader/types.js";
import { DataStore } from "./data/types.js";
import { ManagedRunState, RunState } from "./run/types.js";

export type {
  Capability,
  CommentNode,
  Edge,
  GraphDescriptor,
  GraphIdentifier,
  GraphInlineMetadata,
  InputIdentifier,
  InputValues,
  KitDescriptor,
  KitManifest,
  KitReference,
  NodeConfiguration,
  NodeDescriptor,
  NodeIdentifier,
  NodeTypeIdentifier,
  NodeValue,
  OutputIdentifier,
  OutputValues,
  SubGraphs,
} from "@breadboard-ai/types";

export type BehaviorSchema =
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
   * Indicates that the input our output port is a `BoardCapability`.
   * @see [BoardCapability]
   */
  | "board"
  /**
   * Indicates that the input or output port is a `StreamCapability`.
   * @see [StreamCapability]
   */
  | "stream"
  /**
   * Indicates that the input or output port is an `ErrorCapability`.
   * @see [ErrorCapability]
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
  | "google-drive-file-id";

export type Schema = {
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
   * field with a value, if there is no `examples` present.
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

export type ErrorCapability = Capability & {
  readonly kind: "error";
  readonly error?: Error;
  readonly inputs?: InputValues;
  readonly descriptor?: NodeDescriptor;
};

/**
 * A capability that represents a data value passed over the wire.
 * This is useful for passing inline data (base64 encoded) over the wire, as
 * well as references to external resources.
 */
export type DataCapability = {
  kind: "data";
} & (InlineDataCapabilityPart | StoredDataCapabilityPart);

/**
 * The Map of queues of all outputs that were sent to a given node,
 * and a map of these for all nodes.
 */
export type NodeValuesQueues = Map<string, NodeValue[]>;
export type NodeValuesQueuesMap = Map<NodeIdentifier, NodeValuesQueues>;

export interface QueuedNodeValuesState {
  state: NodeValuesQueuesMap;
  constants: NodeValuesQueuesMap;
  wireOutputs(opportunities: Edge[], outputs: OutputValues): void;
  getAvailableInputs(nodeId: NodeIdentifier): InputValues;
  useInputs(node: NodeIdentifier, inputs: InputValues): void;
}

export interface CompletedNodeOutput {
  promiseId: symbol;
  outputs: OutputValues;
  newOpportunities: Edge[];
}

export interface TraversalResult {
  descriptor: NodeDescriptor;
  inputs: InputValues;
  missingInputs: string[];
  current: Edge;
  opportunities: Edge[];
  newOpportunities: Edge[];
  state: QueuedNodeValuesState;
  outputs?: OutputValues;
  partialOutputs?: OutputValues;
  skip: boolean;
}

/**
 * A function that represents a type of a node in the graph.
 */
export type NodeHandlerFunction = (
  /**
   * The inputs that are supplied to the node.
   */
  inputs: InputValues,
  /**
   * The context of the node's invocation.
   */
  context: NodeHandlerContext
) => Promise<OutputValues | void>;

/**
 * Make sure that kit node names can't accidentally stomp over the properties
 * that describe a kit.
 */
export type ReservedNodeNames = {
  [key in keyof KitDescriptor]?: never;
};

/**
 * The result of running `NodeDescriptorFunction`
 */
export type NodeDescriberResult = {
  inputSchema: Schema;
  outputSchema: Schema;
};

/**
 * Context that is supplied to the `NodeDescriberFunction`.
 */
export type NodeDescriberContext = {
  /**
   * The base URL of the graph.
   */
  base?: URL;
  /**
   * The graph in which the node is described.
   */
  outerGraph: GraphDescriptor;
  /**
   * The loader that can be used to load graphs.
   */
  loader?: GraphLoader;
  /**
   * Information about the wires currently connected to this node.
   */
  wires: NodeDescriberWires;
  /**
   * Kits that are available in the context of the node.
   */
  kits?: Kit[];
};

export type NodeDescriberWires = {
  // Note we only include the output port of incoming wires, and the input port
  // of outgoing wires, because this object is consumed by describe functions,
  // and it wouldn't make sense to ask about ports on the node we're
  // implementing the describe function for, because that would be recursive.
  incoming: Record<string, { outputPort: NodeDescriberPort }>;
  outgoing: Record<string, { inputPort: NodeDescriberPort }>;
};

export type NodeDescriberPort = {
  describe(): Promise<Schema>;
};

/**
 * Asks to describe a node. Can be called in multiple ways:
 * - when called with no arguments, will produce the "default schema". That is,
 * the inputs/outputs that are always available.
 * - when called with inputs and schemas, will produce the "expected schema".
 * For example, when a node changes its schema based on the actual inputs,
 * it will return different schemas when inputs/schemas are supplied than
 * when they are not.
 */
export type NodeDescriberFunction = (
  inputs?: InputValues,
  inputSchema?: Schema,
  outputSchema?: Schema,
  /**
   * The context in which the node is described.
   */
  context?: NodeDescriberContext
) => Promise<NodeDescriberResult>;

export type NodeHandlerMetadata = {
  /**
   * Title of the node type.
   */
  title?: string;
  /**
   * Description of the node type.
   */
  description?: string;
  /**
   * An icon associated with this node type.
   * Can be a URL or a Material Design id.
   */
  icon?: string;
  /**
   * The URL of the node type.
   */
  url?: string;
  /**
   * Whether or not the node is deprecated.
   */
  deprecated?: boolean;
  /*
   * The tags associated with the node.
   */
  tags?: string[];
  /**
   * The documentation for the graph, expressed as a URL and optional description.
   */
  help?: {
    description?: string;
    url: string;
  };
};

export type NodeHandlerObject = {
  invoke: NodeHandlerFunction;
  describe?: NodeDescriberFunction;
  metadata?: NodeHandlerMetadata;
};

export type NodeHandler = NodeHandlerObject | NodeHandlerFunction;

/**
 * All known node handlers.
 */
export type NodeHandlers = ReservedNodeNames &
  Record<NodeTypeIdentifier, NodeHandler>;

export interface Kit extends KitDescriptor {
  get handlers(): NodeHandlers;
}

export type BreadboardSlotSpec = Record<string, GraphDescriptor>;

export type RunResultType = "input" | "output";

export interface BreadboardRunResult {
  /**
   * Type of the run result. This property indicates where the board
   * currently is in the `run` process.
   */
  type: RunResultType;
  /**
   * The current node that is being visited. This property can be used to get
   * information about the current node, such as its id, type, and
   * configuration.
   */
  node: NodeDescriptor;
  /**
   * Any arguments that were passed to the `input` node that triggered this
   * stage.
   * Usually contains `message` property, which is a friendly message
   * to the user about what input is expected.
   * This property is only available when `ResultRunType` is `input`.
   */
  get inputArguments(): InputValues;
  /**
   * The input values the board is waiting for.
   * Set this property to provide input values.
   * This property is only available when `ResultRunType` is `input`.
   */
  set inputs(input: InputValues);
  /**
   * the output values the board is providing.
   * This property is only available when `ResultRunType` is `output`.
   */
  get outputs(): OutputValues;
  /**
   * Current state of the underlying graph traversal.
   * This property is useful for saving and restoring the state of
   * graph traversal.
   */
  get state(): TraversalResult;
  /**
   * The invocation id of the current node. This is useful for tracking
   * the node within the run, similar to an "index" property in map/forEach.
   * @deprecated Use `path` instead.
   */
  get invocationId(): number;
  /**
   * The path of the current node. Supersedes the `invocationId` property.
   */
  get path(): number[];
  /**
   * The timestamp of when this result was issued.
   */
  get timestamp(): number;
  /** The current run state associated with the result. */
  get runState(): RunState | undefined;

  save(): string;
}

export interface NodeFactory {
  create<Inputs, Outputs>(
    kit: Kit | undefined,
    type: NodeTypeIdentifier,
    configuration?: NodeConfigurationConstructor,
    id?: string
  ): BreadboardNode<Inputs, Outputs>;
  getConfigWithLambda(config: ConfigOrGraph): OptionalIdConfiguration;
}

export interface KitConstructor<T extends Kit> {
  new (nodeFactory: NodeFactory): T;
}

export type NodeSugar<In, Out> = (
  config?: ConfigOrGraph
) => BreadboardNode<In, Out>;

export type GenericKit<T extends NodeHandlers> = Kit & {
  [key in keyof T]: NodeSugar<unknown, unknown>;
};

/**
 * Validator metadata for a node.
 * Used e.g. in ProbeDetails.
 */
export interface BreadboardValidatorMetadata {
  description: string;
}

/**
 * A validator for a breadboard.
 * For example to check integrity using information flow control.
 */
export interface BreadboardValidator {
  /**
   * Add a graph and validate it.
   *
   * @param graph The graph to validate.
   * @throws Error if the graph is invalid.
   */
  addGraph(graph: GraphDescriptor): void;

  /**
   * Gets the validation metadata for a node.
   *
   * @param node Node to get metadata for.
   */
  getValidatorMetadata(node: NodeDescriptor): BreadboardValidatorMetadata;

  /**
   * Generate a validator for a subgraph, replacing a given node. Call
   * .addGraph() on the returned validator to add and validate the subgraph.
   *
   * @param node The node to replace.
   * @param actualInputs Actual inputs to the node (as opposed to assuming all
   * inputs with * or that optional ones are present)
   * @returns A validator for the subgraph.
   */
  getSubgraphValidator(
    node: NodeDescriptor,
    actualInputs?: string[]
  ): BreadboardValidator;
}

export type GraphStartProbeData = {
  graph: GraphDescriptor;
  path: number[];
  timestamp: number;
  edges?: EdgeResponse[];
};

export type GraphStartProbeMessage = {
  type: "graphstart";
  data: GraphStartProbeData;
};

export type GraphEndProbeData = {
  path: number[];
  timestamp: number;
};

export type GraphEndProbeMessage = {
  type: "graphend";
  data: GraphEndProbeData;
};

export type SkipProbeMessage = {
  type: "skip";
  data: {
    node: NodeDescriptor;
    inputs: InputValues;
    missingInputs: string[];
    path: number[];
    timestamp: number;
  };
};

export type NodeStartProbeMessage = {
  type: "nodestart";
  data: NodeStartResponse;
  state?: RunState;
};

export type NodeEndProbeMessage = {
  type: "nodeend";
  data: NodeEndResponse;
};

export type EdgeProbeMessage = {
  type: "edge";
  data: EdgeResponse;
};

export type ProbeMessage =
  | GraphStartProbeMessage
  | GraphEndProbeMessage
  | SkipProbeMessage
  | EdgeProbeMessage
  | NodeStartProbeMessage
  | NodeEndProbeMessage;

/**
 * Sent by the runner to supply outputs.
 */
export type OutputResponse = {
  /**
   * The description of the node that is providing output.
   * @see [NodeDescriptor]
   */
  node: NodeDescriptor;
  /**
   * The output values that the node is providing.
   * @see [OutputValues]
   */
  outputs: OutputValues;
  /**
   * Whether or not this input was bubbled.
   */
  bubbled: boolean;
  path: number[];
  timestamp: number;
};

/**
 * Sent by the runner just before a node is about to run.
 */
export type NodeStartResponse = {
  /**
   * The description of the node that is about to run.
   * @see [NodeDescriptor]
   */
  node: NodeDescriptor;
  inputs: InputValues;
  path: number[];
  timestamp: number;
};

export type NodeEndResponse = {
  node: NodeDescriptor;
  inputs: InputValues;
  outputs: OutputValues;
  validatorMetadata?: BreadboardValidatorMetadata[];
  path: number[];
  timestamp: number;
};

export type EdgeResponse = {
  edge: Edge;
  /**
   * The path of the outgoing node.
   */
  from?: number[];
  /**
   * The path of the incoming node.
   */
  to: number[];
  timestamp: number;
  value?: InputValues;
};

/**
 * Sent by the runner to request input.
 */
export type InputResponse = {
  /**
   * The description of the node that is requesting input.
   * @see [NodeDescriptor]
   */
  node: NodeDescriptor;
  /**
   * The input arguments that were given to the node that is requesting input.
   * These arguments typically contain the schema of the inputs that are
   * expected.
   * @see [InputValues]
   */
  inputArguments: InputValues & { schema?: Schema };
  /**
   * The path to the node in the invocation tree, from the root graph.
   */
  path: number[];
  /**
   * Whether or not this input was bubbled.
   */
  bubbled: boolean;
  /**
   * The timestamp of the request.
   */
  timestamp: number;
};

export type ErrorObject = {
  /**
   * The error message. Can be a string or a more detailed object. For
   * example, fetch errors may return a JSON response from the server.
   */
  error: string | object;
  /**
   * The node that threw the error.
   */
  descriptor?: NodeDescriptor;
  /**
   * The inputs that were passed to the node that threw the error.
   */
  inputs?: InputValues;
};
/**
 * Sent by the runner when an error occurs.
 * Error response also indicates that the board is done running.
 */
export type ErrorResponse = {
  /**
   * The error message string or a more detailed error object
   */
  error: string | ErrorObject;
  code?: number;
  timestamp: number;
};

// TODO: Remove extending EventTarget once new runner is converted to use
// reporting.
export interface Probe {
  report?(message: ProbeMessage): Promise<void>;
}

export interface Breadboard extends GraphDescriptor {
  input<In = InputValues, Out = OutputValues>(
    config?: OptionalIdConfiguration
  ): BreadboardNode<In, Out>;
  output<In = InputValues, Out = OutputValues>(
    config?: OptionalIdConfiguration
  ): BreadboardNode<In, Out>;

  addEdge(edge: Edge): void;
  addNode(node: NodeDescriptor): void;
  addKit<T extends Kit>(ctr: KitConstructor<T>): T;
  currentBoardToAddTo(): Breadboard;
  addEdgeAcrossBoards(edge: Edge, from: Breadboard, to: Breadboard): void;
}

export type GraphDescriptorBoardCapability = {
  kind: "board";
  board: GraphDescriptor;
  /**
   * Unresolved path to the board. Use this field to specify the path at
   * compose-time that needs to be resolved at run-time.
   * The path will be resolved as the inputs are received by the board,
   * relative to the invoking board.
   */
};

export type ResolvedURLBoardCapability = {
  kind: "board";
  /**
   * Resolved path to the board. This field is populated at run-time as a
   * result of resolving the `path` field.
   */
  url: string;
};

export type UnresolvedPathBoardCapability = {
  kind: "board";
  /**
   * Unresolved path to the board. Use this field to specify the path at
   * compose-time that needs to be resolved at run-time.
   * The path will be resolved as the inputs are received by the board,
   * relative to the invoking board.
   */
  path: string;
};

export type BreadboardCapability =
  | GraphDescriptorBoardCapability
  | ResolvedURLBoardCapability
  | UnresolvedPathBoardCapability;

export interface NodeHandlerContext {
  readonly board?: GraphDescriptor;
  readonly descriptor?: NodeDescriptor;
  readonly kits?: Kit[];
  readonly base?: URL;
  /**
   * The loader that can be used to load graphs.
   * @see [GraphLoader]
   */
  readonly loader?: GraphLoader;
  readonly outerGraph?: GraphDescriptor;
  readonly probe?: Probe;
  readonly requestInput?: (
    name: string,
    schema: Schema,
    node: NodeDescriptor,
    path: number[],
    state: RunState
  ) => Promise<NodeValue>;
  /**
   * Provide output directly to the user. This will bypass the normal output
   * flow and will not be passed as outputs.
   * @param output - The values to provide
   * @param schema - The schema to use for the output
   * @returns - Promise that resolves when the output is provided
   */
  readonly provideOutput?: (
    outputs: OutputValues,
    descriptor: NodeDescriptor,
    path: number[]
  ) => Promise<void>;
  readonly invocationPath?: number[];
  readonly state?: ManagedRunState;
  /**
   * The `AbortSignal` that can be used to stop the board run.
   */
  readonly signal?: AbortSignal;
  /**
   * The data store that can be used to store data across nodes.
   */
  readonly store?: DataStore;
}

export type RunArguments = NodeHandlerContext & {
  /**
   * Input values that will be used for bubbled inputs. If not found, a fallback
   * action will be taken. For example, the web-based harness will ask the user.
   */
  inputs?: InputValues;
  /**
   * Start label to use for the run. This is useful for specifying a particular
   * node as the start of the run. If not provided, nodes without any incoming
   * edges will be used.
   */
  start?: StartLabel;
};

export interface BreadboardNode<Inputs, Outputs> {
  /**
   * Wires the current node to another node.
   *
   * Use this method to wire nodes together.
   *
   * @param spec - the wiring spec. See the [wiring spec](https://github.com/breadboard-ai/breadboard/blob/main/packages/breadboard/docs/wires.md) for more details.
   * @param to - the node to wire this node with.
   * @returns - the current node, to enable chaining.
   */
  wire<ToInputs, ToOutputs>(
    // spec: WireSpec<Inputs, Outputs, ToInputs, ToOutputs>,
    spec: string,
    to: BreadboardNode<ToInputs, ToOutputs>
  ): BreadboardNode<Inputs, Outputs>;

  readonly id: NodeIdentifier;
}

/**
 * A node configuration that can optionally have an `$id` property.
 *
 * The `$id` property is used to identify the node in the board and is not
 * passed to the node itself.
 */
export type OptionalIdConfiguration = {
  $id?: string;
} & NodeConfigurationConstructor;

/**
 * A node configuration that optionally has nodes as values. The Node()
 * constructor will remove those and turn them into wires into the node instead.
 */
export type NodeConfigurationConstructor = Record<
  string,
  NodeValue | BreadboardNode<InputValues, OutputValues>
>; // extends NodeConfiguration

/**
 * Syntactic sugar for node factories that accept lambdas. This allows passing
 * either
 *  - A JS function that is a lambda function defining the board
 *  - A board capability, i.e. the result of calling lambda()
 *  - A board node, which should be a node with a `board` output
 * or
 *  - A regular config, with a `board` property with any of the above.
 *
 * use `getConfigWithLambda()` to turn this into a regular config.
 */
export type ConfigOrGraph =
  | OptionalIdConfiguration
  | BreadboardCapability
  | GraphDescriptor;
