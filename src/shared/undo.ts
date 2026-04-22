import type { SerializableValue } from "./types";

export type UndoCommand = {
  kind: "putRecord";
  label: string;
  key: SerializableValue;
  storeName: string;
  dbName: string;
  dbVersion: number;
  frameId: number;
  before: SerializableValue;
  after: SerializableValue;
};

export class UndoStack {
  private undos: UndoCommand[] = [];
  private redos: UndoCommand[] = [];
  private readonly cap: number;

  constructor(cap = 100) {
    this.cap = cap;
  }

  push(cmd: UndoCommand): void {
    this.undos.push(cmd);
    if (this.undos.length > this.cap) this.undos.shift();
    this.redos = [];
  }

  undo(): UndoCommand | null {
    const cmd = this.undos.pop();
    if (!cmd) return null;
    this.redos.push(cmd);
    return cmd;
  }

  redo(): UndoCommand | null {
    const cmd = this.redos.pop();
    if (!cmd) return null;
    this.undos.push(cmd);
    return cmd;
  }

  get canUndo(): boolean {
    return this.undos.length > 0;
  }

  get canRedo(): boolean {
    return this.redos.length > 0;
  }

  clear(): void {
    this.undos = [];
    this.redos = [];
  }
}
