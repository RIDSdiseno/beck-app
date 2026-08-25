import { formatDateOnly } from "../dateTime";

describe("fechas sin hora", () => {
  it("no retrocede el día al recibir una fecha UTC", () => {
    expect(formatDateOnly("2026-08-21T00:00:00.000Z")).toBe("21-08-2026");
  });

  it("permite el formato con nombre de mes sin cambiar la fecha", () => {
    expect(
      formatDateOnly("2026-08-21", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ).toContain("21");
  });

  it("descarta valores que no contienen una fecha ISO", () => {
    expect(formatDateOnly("fecha inválida")).toBe("Sin fecha");
  });
});
