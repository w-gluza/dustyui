function Chevron({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function PreviousMatchIcon() {
  return <Chevron path="m5 12.5 5-5 5 5" />;
}

export function NextMatchIcon() {
  return <Chevron path="m5 7.5 5 5 5-5" />;
}
