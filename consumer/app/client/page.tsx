"use client";

import { useState } from "react";
import { Avatar, Badge, Button, IconButton, ObjectInspector } from "dustyui";
import { park, rows, rowsOpen } from "../data";

export default function ClientPage() {
  const [isMounted, setIsMounted] = useState(false);

  return (
    <main>
      <Button onClick={() => setIsMounted(true)}>Mount</Button>
      {isMounted ? (
        <>
          <Avatar name="Mounted Later" size={32} />
          <Badge label="New" icon="*" />
          <IconButton label="Close" icon="x" />
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
