"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  ObjectInspector,
  TrackList,
} from "dustyui";
import { park, rows, rowsOpen } from "../data";

const tracks = [
  { id: "sunrise", title: "Sunrise", duration: "3:10" },
  { id: "dusk", title: "Dusk", duration: "4:20" },
];

export default function ClientPage() {
  const [isMounted, setIsMounted] = useState(false);

  const [currentTrack, setCurrentTrack] = useState(0);

  return (
    <main>
      <Button onClick={() => setIsMounted(true)}>Mount</Button>
      {isMounted ? (
        <>
          <Avatar name="Mounted Later" size={32} />
          <Badge label="New" icon="*" />
          <IconButton label="Close" icon="x" />
          <TrackList
            label="Tracks"
            tracks={tracks}
            currentTrack={currentTrack}
            onTrackSelect={setCurrentTrack}
          />
          <ObjectInspector
            label="Park"
            value={park}
            defaultExpanded={["$", "$/.animals"]}
            searchable
            showDetails
          />
          <ObjectInspector
            label="Rows"
            value={rows}
            defaultExpanded={rowsOpen}
            className="scroller"
          />
        </>
      ) : null}
    </main>
  );
}
