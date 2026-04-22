import { describe, expect, it } from "vitest";
import { UndoStack, type UndoCommand } from "./undo";

function cmd(label: string): UndoCommand {
  return { kind: "putRecord", label, key: 1, storeName: "s", dbName: "db", dbVersion: 1, frameId: 0, before: null, after: "x" };
}

describe("UndoStack", () => {
  it("starts empty", () => {
    const stack = new UndoStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it("reports canUndo after push", () => {
    const stack = new UndoStack();
    stack.push(cmd("a"));
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it("undo returns most recent command", () => {
    const stack = new UndoStack();
    stack.push(cmd("a"));
    stack.push(cmd("b"));
    const popped = stack.undo();
    expect(popped?.label).toBe("b");
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(true);
  });

  it("redo restores undone command", () => {
    const stack = new UndoStack();
    stack.push(cmd("a"));
    stack.undo();
    const redone = stack.redo();
    expect(redone?.label).toBe("a");
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it("pushing clears redo stack", () => {
    const stack = new UndoStack();
    stack.push(cmd("a"));
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.push(cmd("b"));
    expect(stack.canRedo).toBe(false);
  });

  it("respects depth cap", () => {
    const stack = new UndoStack(3);
    stack.push(cmd("a"));
    stack.push(cmd("b"));
    stack.push(cmd("c"));
    stack.push(cmd("d")); // should evict "a"
    const ops: string[] = [];
    let op = stack.undo();
    while (op) { ops.push(op.label); op = stack.undo(); }
    expect(ops).toEqual(["d", "c", "b"]);
    expect(ops).not.toContain("a");
  });

  it("clear empties both stacks", () => {
    const stack = new UndoStack();
    stack.push(cmd("a"));
    stack.undo();
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it("undo returns null when empty", () => {
    const stack = new UndoStack();
    expect(stack.undo()).toBeNull();
  });

  it("redo returns null when nothing undone", () => {
    const stack = new UndoStack();
    expect(stack.redo()).toBeNull();
  });
});
