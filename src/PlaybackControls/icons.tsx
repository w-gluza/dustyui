function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function PlayIcon() {
  return <Icon path="M6 3.5v13l10.5-6.5z" />;
}

export function PauseIcon() {
  return <Icon path="M5 3.5h3.5v13H5zM11.5 3.5H15v13h-3.5z" />;
}

export function PreviousIcon() {
  return <Icon path="M4 4h2v12H4zM16.5 4v12L7.5 10z" />;
}

export function NextIcon() {
  return <Icon path="M14 4h2v12h-2zM3.5 4v12l9-6z" />;
}
