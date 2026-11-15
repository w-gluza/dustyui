import { getChildId, getRangeId, ROOT_ID } from "dustyui";

export const park = {
  name: "Torres del Paine",
  established: 1959,
  animals: [{ commonName: "Guanaco" }, { commonName: "Puma" }],
};

export const rows = {
  rows: Array.from({ length: 5000 }, (_, index) => `row ${index}`),
};

const rowsId = getChildId(ROOT_ID, { type: "property", key: "rows" });

export const rowsOpen = [
  ROOT_ID,
  rowsId,
  ...Array.from({ length: 50 }, (_, index) =>
    getRangeId(rowsId, "items", index * 100, index * 100 + 100),
  ),
];
