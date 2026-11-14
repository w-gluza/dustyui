import { Avatar, Badge, Button, ObjectInspector } from "dustyui";
import { park, rows } from "./data";

export default function ServerPage() {
  return (
    <main>
      <Button>Save</Button>
      <Badge label="New" />
      <Avatar name="Server Side" size={32} />
      <p id="mono" data-theme="mono">
        Mono theme
      </p>
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
        defaultExpanded={["$", "$/.rows"]}
        className="scroller"
      />
    </main>
  );
}
