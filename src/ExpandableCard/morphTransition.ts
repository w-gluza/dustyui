const TRANSITION_TYPE = "dusty-expandable-card";

let activeTransition: ViewTransition | undefined;

interface Morph {
  update: () => void;
  settle: () => void;
  done: () => void;
}

function startTransition(update: () => void): ViewTransition {
  try {
    return document.startViewTransition({ update, types: [TRANSITION_TYPE] });
  } catch {
    return document.startViewTransition(update);
  }
}

function canAnimate(): boolean {
  return (
    "startViewTransition" in document &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function settleAnimations(root: Element | null | undefined) {
  for (const animation of root?.getAnimations({ subtree: true }) ?? []) {
    try {
      animation.finish();
    } catch {
      animation.cancel();
    }
  }
}

export function skipActiveMorph() {
  activeTransition?.skipTransition();
}

export function runMorph(morph: Morph) {
  if (activeTransition) {
    const interrupted = activeTransition;
    interrupted.skipTransition();
    void interrupted.finished.finally(() => {
      requestAnimationFrame(() => {
        runMorph(morph);
      });
    });
    return;
  }
  if (!canAnimate()) {
    morph.update();
    morph.done();
    return;
  }
  morph.settle();
  const transition = startTransition(morph.update);
  activeTransition = transition;
  transition.ready.catch(() => undefined);
  void transition.finished.finally(() => {
    if (activeTransition === transition) {
      activeTransition = undefined;
    }
    morph.done();
  });
}
