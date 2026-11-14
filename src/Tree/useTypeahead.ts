import { useRef } from "react";
import { getTypeaheadText, type TreeAction } from "./treeModel.js";

const TYPEAHEAD_PAUSE = 500;

export function useTypeahead(): (
  action: TreeAction,
  timeStamp: number,
) => TreeAction {
  const typed = useRef({ text: "", at: 0 });

  return (action, timeStamp) => {
    if (action.type !== "typeahead") {
      return action;
    }
    const isContinuing = timeStamp - typed.current.at < TYPEAHEAD_PAUSE;
    const text = getTypeaheadText(
      typed.current.text,
      action.text,
      isContinuing,
    );
    typed.current = { text, at: timeStamp };
    return { type: "typeahead", text };
  };
}
