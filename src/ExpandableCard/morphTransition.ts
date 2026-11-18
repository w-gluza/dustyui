const TRANSITION_TYPE = "dusty-expandable-card";

let active: { transition: ViewTransition; owner: object } | undefined;

interface Morph {
  owner: object;
  begin: () => void;
  update: () => void;
  settle: () => void;
  done: () => void;
}

function canAnimate(): boolean {
  return (
    "startViewTransition" in document &&
    "types" in ViewTransition.prototype &&
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

export function skipMorphOf(owner: object) {
  if (active?.owner === owner) {
    active.transition.skipTransition();
  }
}

export function runMorph(morph: Morph) {
  if (active) {
    const interrupted = active.transition;
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
  morph.begin();
  morph.settle();
  const transition = document.startViewTransition({
    update: morph.update,
    types: [TRANSITION_TYPE],
  });
  active = { transition, owner: morph.owner };
  transition.ready.catch(() => undefined);
  void transition.finished.finally(() => {
    if (active?.transition === transition) {
      active = undefined;
    }
    morph.done();
  });
}
