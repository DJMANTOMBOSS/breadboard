/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type Values = Record<string, unknown>;
export type ModuleSpec = Record<string, string>;
export type ModuleMethod = "default" | "describe";

export type DescriberInputs = {
  inputs?: Values;
  inputSchema?: unknown;
  outputSchema?: unknown;
};
export type DescriberOutputs = { inputSchema: unknown; outputSchema: unknown };
export type InvokeInputs = Values;
export type InvokeOutputs = Values;

export type Capability = (inputs: Values) => Promise<Values | void>;

export type CapabilitySpec = {
  fetch?: Capability;
  invoke?: Capability;
  secrets?: Capability;
};

export type Sandbox = {
  runModule(
    invocationId: UUID,
    method: "default" | "describe",
    modules: ModuleSpec,
    name: string,
    inputs: Record<string, unknown>
  ): Promise<InvokeOutputs | DescriberOutputs>;
};

export type UUID = `${string}-${string}-${string}-${string}-${string}`;