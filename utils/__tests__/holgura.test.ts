import { HOLGURA_OPTIONS } from "../holgura";

describe("HOLGURA_OPTIONS", () => {
  it("envía el límite en centímetros de cada tramo y no el factor", () => {
    expect(HOLGURA_OPTIONS.map(({ value }) => value)).toEqual([
      "2",
      "4",
      "6",
      "10",
      "0",
    ]);
  });

  it("identifica los rangos como centímetros", () => {
    expect(HOLGURA_OPTIONS.slice(0, 4).every(({ label }) => label.includes("cm")))
      .toBe(true);
  });
});
