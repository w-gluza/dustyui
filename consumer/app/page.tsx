import { Avatar, Badge, Button, ObjectInspector, TrackList } from "dustyui";
import { park, rows, rowsOpen } from "./data";

export default function ServerPage() {
  return (
    <main>
      <Button>Save</Button>
      <Badge label="New" />
      <Avatar name="Server Side" size="small" />
      <TrackList
        label="Tracks"
        tracks={[{ title: "Dawn Static", duration: "3:42" }]}
        currentTrack={0}
      />
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
        defaultExpanded={rowsOpen}
        className="scroller"
      />
    </main>
  );
}
