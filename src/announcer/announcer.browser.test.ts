import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announcements, resetAnnouncer } from "../test/announcements.js";
import { announce, readyAnnouncer } from "./announcer.js";

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

  describe("with modal dialogs", () => {
    function openModal(): HTMLDialogElement {
      const dialog = document.createElement("dialog");
      const button = document.createElement("button");
      dialog.append(button);
      document.body.append(dialog);
      dialog.showModal();
      return dialog;
    }

    afterEach(() => {
      document.querySelectorAll("dialog").forEach((dialog) => {
        dialog.remove();
      });
    });

    it("announces inside the open modal, where the rest of the page is inert", () => {
      const dialog = openModal();

      announce("Saved");
      vi.advanceTimersByTime(100);

      expect(dialog.querySelector("[data-dusty-announcer]")).not.toBeNull();
      expect(announcements()).toEqual(["Saved"]);
    });

    it("still delivers a message when the modal closes straight after it", () => {
      const dialog = openModal();
      announce("Ready");
      vi.advanceTimersByTime(100);

      announce("Saved");
      dialog.close();
      vi.advanceTimersByTime(200);

      const container = document.querySelector("[data-dusty-announcer]");
      expect(container?.parentElement).toBe(document.body);
      expect(announcements()).toContain("Saved");
    });

    it("still delivers a message when the modal is removed straight after it", () => {
      const dialog = openModal();
      announce("Ready");
      vi.advanceTimersByTime(100);

      announce("Saved");
      dialog.remove();
      vi.advanceTimersByTime(200);

      expect(
        document.body.querySelector("[data-dusty-announcer]")?.isConnected,
      ).toBe(true);
      expect(announcements()).toContain("Saved");
    });

    it("moves into a modal that opens straight after the message", () => {
      announce("Ready");
      vi.advanceTimersByTime(100);

      announce("Saved");
      const dialog = openModal();
      vi.advanceTimersByTime(200);

      expect(dialog.querySelector("[data-dusty-announcer]")).not.toBeNull();
      expect(announcements()).toContain("Saved");
    });

    it("gives a region moved while a message waits its full time to register", () => {
      announce("Saved");
      vi.advanceTimersByTime(50);

      openModal();
      readyAnnouncer();
      vi.advanceTimersByTime(50);
      expect(announcements()).toEqual([]);

      vi.advanceTimersByTime(49);
      expect(announcements()).toEqual([]);

      vi.advanceTimersByTime(1);
      expect(announcements()).toEqual(["Saved"]);
    });

    it("uses the modal that holds focus, whatever the document order", () => {
      const later = document.createElement("dialog");
      later.append(document.createElement("button"));
      const earlier = document.createElement("dialog");
      earlier.append(document.createElement("button"));
      document.body.append(later, earlier);
      earlier.showModal();
      later.showModal();

      announce("Saved");
      vi.advanceTimersByTime(100);

      expect(later.querySelector("[data-dusty-announcer]")).not.toBeNull();
    });
  });

  describe("cancelling", () => {
    it("drops a message that has not been added yet", () => {
      const cancel = announce("Loading");
      cancel();
      vi.advanceTimersByTime(100);

      expect(announcements()).toEqual([]);
    });

    it("removes a message that has already been added", () => {
      const cancel = announce("Loading");
      vi.advanceTimersByTime(100);
      expect(announcements()).toEqual(["Loading"]);

      cancel();

      expect(announcements()).toEqual([]);
    });
  });
});
