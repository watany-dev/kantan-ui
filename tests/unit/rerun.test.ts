import { describe, expect, it } from "vitest";
import { rerun } from "../../src/runtime/rerun";
import { getContext } from "../../src/runtime/context";

describe("rerun", () => {
  it("should execute script and return HTML", () => {
    const script = () => "<div>Hello</div>";
    const result = rerun(script);
    expect(result).toBe("<div>Hello</div>");
  });

  it("should clear context after execution", () => {
    const script = () => "<div>Test</div>";
    rerun(script);
    expect(getContext()).toBeNull();
  });

  it("should provide event context during execution", () => {
    let capturedContext: ReturnType<typeof getContext> = null;

    const script = () => {
      capturedContext = getContext();
      return "<div>Test</div>";
    };

    rerun(script, { widgetId: "btn1", value: "clicked" });

    expect(capturedContext).not.toBeNull();
    expect(capturedContext?.event?.widgetId).toBe("btn1");
    expect(capturedContext?.event?.value).toBe("clicked");
  });

  it("should clear context even if script throws", () => {
    const script = () => {
      throw new Error("Test error");
    };

    expect(() => rerun(script)).toThrow("Test error");
    expect(getContext()).toBeNull();
  });
});
