/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SettingsStore } from "../../types/types.js";
import {
  GraphProvider,
  InspectableRun,
  InspectableRunEvent,
  InspectableRunInputs,
} from "@google-labs/breadboard";

const MAXIMIZE_KEY = "bb-board-activity-overlay-maximized";
const DOCK_KEY = "bb-board-activity-overlay-docked";

@customElement("bb-board-activity-overlay")
export class BoardActivityOverlay extends LitElement {
  @property()
  run: InspectableRun | null = null;

  @property()
  location = { x: 10, y: 10 };

  @property()
  inputsFromLastRun: InspectableRunInputs | null = null;

  @property()
  settings: SettingsStore | null = null;

  @property()
  providers: GraphProvider[] = [];

  @property()
  providerOps = 0;

  @property()
  events: InspectableRunEvent[] | null = null;

  @state()
  debugEvent: InspectableRunEvent | null = null;

  static styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      display: block;
      position: fixed;
      z-index: 20;
    }

    #content {
      width: 100%;
      max-height: none;
      flex: 1;
      overflow-y: auto;
    }

    #container {
      padding: var(--bb-grid-size-4) var(--bb-grid-size-4) var(--bb-grid-size)
        var(--bb-grid-size-4);
      height: 40svh;
    }

    #back-to-activity {
      background: var(--bb-ui-50) var(--bb-icon-arrow-back) 6px center / 20px
        20px no-repeat;
      border: none;
      font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
        var(--bb-font-family);
      color: var(--bb-ui-600);
      padding: var(--bb-grid-size) var(--bb-grid-size-4) var(--bb-grid-size)
        var(--bb-grid-size-8);
      margin-right: var(--bb-grid-size-2);
      border-radius: 50px;
      cursor: pointer;
      transition: background-color 0.2s cubic-bezier(0, 0, 0.3, 1);
    }

    #back-to-activity:hover,
    #back-to-activity:focus {
      background-color: var(--bb-ui-100);
    }
  `;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (!changedProperties.has("run")) {
      return;
    }

    this.debugEvent = null;
  }

  render() {
    const events = this.run?.events ?? [];
    const eventPosition = events.length - 1;

    return html`<bb-drag-dock-overlay
      .dockable=${true}
      .dock=${{ top: true, left: false, bottom: true, right: true }}
      .overlayIcon=${"activity"}
      .overlayTitle=${"Board activity"}
      .maximizeKey=${MAXIMIZE_KEY}
      .dockKey=${DOCK_KEY}
    >
      <div id="content">
        <div id="container">
          ${this.debugEvent
            ? html` <bb-event-details
                .event=${this.debugEvent}
              ></bb-event-details>`
            : html`<bb-activity-log
                .run=${this.run}
                .events=${events}
                .eventPosition=${eventPosition}
                .inputsFromLastRun=${this.inputsFromLastRun}
                .showExtendedInfo=${true}
                .settings=${this.settings}
                .showLogTitle=${false}
                .logTitle=${"Debug Board"}
                .waitingMessage=${'Click "Debug Board" to get started'}
                .providers=${this.providers}
                .providerOps=${this.providerOps}
                @pointerdown=${(evt: PointerEvent) => {
                  const [top] = evt.composedPath();
                  if (!(top instanceof HTMLElement) || !top.dataset.messageId) {
                    return;
                  }
                  evt.stopImmediatePropagation();
                  const id = top.dataset.messageId;
                  const event = this.run?.getEventById(id);
                  if (!event) {
                    // TODO: Offer the user more information.
                    console.warn(`Unable to find event with ID "${id}"`);
                    return;
                  }
                  if (event.type !== "node") {
                    return;
                  }
                  this.debugEvent = event;
                }}
                name="Board"
              ></bb-activity-log>`}
        </div>
      </div>
    </bb-drag-dock-overlay>`;
  }
}