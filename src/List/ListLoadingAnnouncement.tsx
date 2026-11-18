"use client";

import { useEffect } from "react";
import { announce, readyAnnouncer } from "../announcer/announcer.js";

export function ListLoadingAnnouncement({ label }: { label: string }) {
  useEffect(readyAnnouncer, []);
  useEffect(() => announce(label), [label]);

  return null;
}
