import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobStatusBar } from "@/components/job-status-bar";

type Listener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<string, Listener>();
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, listener: Listener) {
    this.listeners.set(event, listener);
  }

  close() {
    this.closed = true;
  }

  emit(event: string, data: unknown) {
    this.listeners.get(event)?.(new MessageEvent(event, { data: JSON.stringify(data) }));
  }
}

describe("JobStatusBar", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.EventSource = originalEventSource;
  });

  it("streams status updates and shows a completion toast", () => {
    const onComplete = vi.fn();
    render(<JobStatusBar jobId="job_123" onComplete={onComplete} />);
    const source = MockEventSource.instances[0];

    expect(source.url).toBe("/api/v1/jobs/job_123/status");

    act(() => {
      source.emit("status", { stage: "Analysing repositories", progress: 0.42 });
    });

    expect(screen.getByText("Analysing repositories")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();

    act(() => {
      source.emit("complete", { stage: "Profile analysis complete" });
    });

    expect(source.closed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Profile analysis complete");
  });

  it("shows an error toast when SSE reports failure", () => {
    render(<JobStatusBar jobId="job_failed" />);
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit("error", { error: "GitHub API rate limit exceeded" });
    });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(screen.getByRole("status")).toHaveTextContent("GitHub API rate limit exceeded");
  });
});
