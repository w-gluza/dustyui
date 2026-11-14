"use client";

import { useState } from "react";
import { Avatar, Button, ObjectInspector } from "dustyui";
import { park, rows } from "../data";

export default function ClientPage() {
  const [isMounted, setIsMounted] = useState(false);

  return (
    <main>
      <Button onClick={() => setIsMounted(true)}>Mount</Button>
      {isMounted ? (
        <>
          <Avatar name="Mounted Later" size={32} />
          <ObjectInspector
            label="Park"
            value={park}
            defaultExpanded={["$", "$/.animals"]}
          />
          <ObjectInspector
            label="Rows"
            value={rows}
            defaultExpanded={["$", "$/.rows"]}
            className="scroller"
          />
        </>
      ) : null}
    </main>
  );
}
