export const park = {
  name: "Torres del Paine",
  established: 1959,
  animals: [{ commonName: "Guanaco" }, { commonName: "Puma" }],
};

export const rows = {
  rows: Array.from({ length: 5000 }, (_, index) => `row ${index}`),
};

export const rowsOpen = [
  "$",
  "$/.rows",
  ...Array.from(
    { length: 50 },
    (_, index) => `$/.rows/~i${index * 100}-${index * 100 + 99}`,
  ),
];
