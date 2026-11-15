import {
  Button,
  describeValue,
  getChildId,
  getNode,
  getNodeTrail,
  getPropertiesId,
  getRangeId,
  ObjectInspector,
  ROOT_ID,
  Tree,
  type PathStep,
  type RangeUnit,
} from "dustyui";

const step: PathStep = { type: "index", index: 0 };
const unit: RangeUnit = "items";

export const exported = [
  Button,
  describeValue,
  getChildId(ROOT_ID, step),
  getNode,
  getNodeTrail,
  getPropertiesId(ROOT_ID),
  getRangeId(ROOT_ID, unit, 0, 100),
  ObjectInspector,
  Tree,
];
