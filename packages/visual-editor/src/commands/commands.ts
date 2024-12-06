/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraphDescriptor } from "@breadboard-ai/types";
import { KeyboardCommand, KeyboardCommandDeps } from "./types";
import * as BreadboardUI from "@breadboard-ai/shared-ui";
import { EditSpec } from "@google-labs/breadboard";

export const DeleteCommand: KeyboardCommand = {
  keys: ["Delete", "Backspace"],

  async do({
    runtime,
    selectionState,
    tab,
  }: KeyboardCommandDeps): Promise<void> {
    const editor = runtime.edit.getEditor(tab);
    if (!editor) {
      throw new Error("Unable to edit graph");
    }

    if (
      !tab ||
      !selectionState ||
      (!tab.moduleId && selectionState.selectionState.graphs.size === 0)
    ) {
      throw new Error("Nothing to delete");
    }

    const graph = editor.inspect("");
    const spec = runtime.util.generateDeleteEditSpecFrom(
      selectionState.selectionState,
      graph
    );

    await editor.edit(spec, selectionState.selectionChangeId);
    runtime.select.deselectAll(
      tab.id,
      runtime.util.createWorkspaceSelectionChangeId()
    );
  },
};

export const SelectAllCommand: KeyboardCommand = {
  keys: ["Cmd+a", "Ctrl+a"],

  async do({ runtime, tab }: KeyboardCommandDeps): Promise<void> {
    const editor = runtime.edit.getEditor(tab);
    if (!editor) {
      return;
    }

    if (!tab) {
      throw new Error("Nothing to select");
    }

    const graph = editor.inspect("");
    runtime.select.selectAll(tab.id, runtime.select.generateId(), graph);
  },
};

export const CopyCommand: KeyboardCommand = {
  keys: ["Cmd+c", "Ctrl+c"],
  messagePending: "Copying to clipboard",
  messageComplete: "Copied to clipboard",
  messageType: BreadboardUI.Events.ToastType.INFORMATION,
  alwaysNotify: true,

  async do({
    runtime,
    selectionState,
    tab,
  }: KeyboardCommandDeps): Promise<void> {
    const editor = runtime.edit.getEditor(tab);
    if (!editor) {
      throw new Error("Unable to edit graph");
    }

    if (
      !tab ||
      !selectionState ||
      selectionState.selectionState.graphs.size === 0
    ) {
      throw new Error("Nothing to copy");
    }

    const graph = editor.inspect("");
    const board = runtime.util.generateBoardFrom(
      selectionState.selectionState,
      graph
    );

    await navigator.clipboard.writeText(JSON.stringify(board, null, 2));
  },
};

export const CutCommand: KeyboardCommand = {
  keys: ["Cmd+x", "Ctrl+x"],

  async do({
    runtime,
    selectionState,
    tab,
  }: KeyboardCommandDeps): Promise<void> {
    const editor = runtime.edit.getEditor(tab);
    if (!editor) {
      throw new Error("Unable to edit graph");
    }

    if (
      !tab ||
      !selectionState ||
      selectionState.selectionState.graphs.size === 0
    ) {
      throw new Error("Nothing to cut");
    }

    const graph = editor.inspect("");
    const board = runtime.util.generateBoardFrom(
      selectionState.selectionState,
      graph
    );

    const spec = runtime.util.generateDeleteEditSpecFrom(
      selectionState.selectionState,
      graph
    );

    await Promise.all([
      navigator.clipboard.writeText(JSON.stringify(board, null, 2)),
      editor.edit(spec, selectionState.selectionChangeId),
    ]);
  },
};

// We do this unusual concatenation to bamboozle TypeScript. If we just check
// for the presence of 'canParse' in URL then the else case assumes we're
// dealing with the nodejs version of URL, which isn't necessarily the case; we
// could just as well be dealing with an older browser version. So we do this
// concatenation which is functionally inert but which means the TypeScript
// compiler continues to work on the assumption that it's a browser URL.
const cP = "" + "canParse";
function canParse(urlLike: string): boolean {
  if (cP in URL) {
    return URL.canParse(urlLike);
  }

  try {
    new URL(urlLike);
    return true;
  } catch (err) {
    return false;
  }
}

export const PasteCommand: KeyboardCommand = {
  keys: ["Cmd+v", "Ctrl+v"],

  async do({
    runtime,
    tab,
    pointerLocation,
  }: KeyboardCommandDeps): Promise<void> {
    const clipboardContents = await navigator.clipboard.readText();
    let boardContents: GraphDescriptor | undefined;
    let boardUrl: string | undefined;
    try {
      if (canParse(clipboardContents)) {
        boardUrl = (URL.parse(clipboardContents) ?? { href: undefined }).href;
      } else {
        boardContents = JSON.parse(clipboardContents);
        // TODO: Proper board checks.
        if (
          !boardContents ||
          !("edges" in boardContents && "nodes" in boardContents)
        ) {
          throw new Error("Not a board");
        }
      }

      // Option 1. User pastes a board when there is no tab - create a new tab
      if (tab) {
        const editor = runtime.edit.getEditor(tab);
        if (!editor) {
          throw new Error("Unable to edit graph");
        }

        const graph = editor.inspect("");
        let spec: EditSpec[] = [];
        // 1a. Paste a board.
        if (boardContents) {
          spec = runtime.util.generateAddEditSpecFromDescriptor(
            boardContents,
            graph,
            pointerLocation
          );
        } else if (boardUrl) {
          // 1b. Paste a URL.
          spec = runtime.util.generateAddEditSpecFromURL(
            boardUrl,
            graph,
            pointerLocation
          );
        } else {
          throw new Error("Unable to paste; neither URL nor GraphDescriptor");
        }

        await editor.edit(spec, runtime.util.createEditChangeId());
        const workspaceSelection = runtime.util.generateSelectionFrom(spec);

        runtime.select.processSelections(
          tab.id,
          runtime.util.createWorkspaceSelectionChangeId(),
          workspaceSelection
        );
      } else {
        // Option 2. User pastes a board.
        if (boardContents) {
          runtime.board.createTabFromDescriptor(boardContents);
        }
      }
    } catch (err) {
      throw new Error("Invalid clipboard contents");
    }
  },
};