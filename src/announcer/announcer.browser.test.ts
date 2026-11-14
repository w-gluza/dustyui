import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announcements, resetAnnouncer } from "../test/announcements.js";
import { announce } from "./announcer.js";

describe("announce", () => {
  beforeEach(() => {
    resetAnnouncer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds the message to the polite region by default", () => {
    announce("3 unread messages");
    vi.advanceTimersByTime(100);

    expect(announcements("polite")).toEqual(["3 unread messages"]);
    expect(announcements("assertive")).toEqual([]);
  });

  it("adds urgent messages to the assertive region", () => {
    announce("Connection lost", "assertive");
    vi.advanceTimersByTime(100);

    expect(announcements("assertive")).toEqual(["Connection lost"]);
    expect(announcements("polite")).toEqual([]);
  });

  it("waits for the new region to be registered before adding the first message", () => {
    announce("Saved");

    expect(document.querySelector("[data-dusty-announcer]")).not.toBeNull();
    expect(announcements()).toEqual([]);

    vi.advanceTimersByTime(100);
    expect(announcements()).toEqual(["Saved"]);
  });

  it("ignores blank messages", () => {
    announce("");
    announce("   ");
    vi.advanceTimersByTime(100);

    expect(document.querySelector("[data-dusty-announcer]")).toBeNull();
  });

  it("keeps repeated messages as separate entries so each is read out", () => {
    announce("Saved");
    announce("Saved");
    vi.advanceTimersByTime(100);

    expect(announcements()).toEqual(["Saved", "Saved"]);
  });

  it("reuses one live region for every call", () => {
    announce("First");
    announce("Second", "assertive");
    vi.advanceTimersByTime(100);

    expect(document.querySelectorAll("[data-dusty-announcer]")).toHaveLength(1);
  });

  it("removes a message once it has had time to be read", () => {
    announce("Saved");
    vi.advanceTimersByTime(100);
    expect(announcements()).toEqual(["Saved"]);

    vi.advanceTimersByTime(7000);
    expect(announcements()).toEqual([]);
  });

  it("is hidden visually but not from assistive technology", () => {
    announce("Saved");
    const container = document.querySelector("[data-dusty-announcer]");
    const { width, height } = container!.getBoundingClientRect();

    expect([width, height]).toEqual([1, 1]);
    expect(getComputedStyle(container!).display).not.toBe("none");
    expect(getComputedStyle(container!).visibility).toBe("visible");
  });
});
