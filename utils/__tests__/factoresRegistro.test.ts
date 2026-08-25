import {
  ACCESIBILIDAD_OPTIONS,
  getAislacionLabel,
  getAislacionOption,
  getAplicacionLabel,
} from "../factoresRegistro";

describe("factores de registro", () => {
  it("permite los niveles válidos y la opción neutral No aplica", () => {
    expect(ACCESIBILIDAD_OPTIONS.map(({ value }) => value)).toEqual([
      "1",
      "2",
      "3",
      "0",
    ]);
  });

  it("prioriza el estado de aislación resuelto por el backend", () => {
    expect(getAislacionOption({ aislacion: 1, aislacion_aplica: true })).toBe(
      "1",
    );
    expect(getAislacionOption({ aislacion: 1.3, aislacion_aplica: false })).toBe(
      "0",
    );
  });

  it("interpreta los factores predeterminados al usar un backend anterior", () => {
    expect(getAislacionOption({ aislacion: 1 })).toBe("0");
    expect(getAislacionOption({ aislacion: 1.3 })).toBe("1");
  });

  it("muestra estados legibles sin reemplazar los factores almacenados", () => {
    expect(getAislacionLabel({ aislacion: 1.3, aislacion_aplica: true })).toBe("Aplica");
    expect(getAislacionLabel({ aislacion: 1, aislacion_aplica: false })).toBe("No aplica");
    expect(getAplicacionLabel(1)).toBe("Aplica");
    expect(getAplicacionLabel(0)).toBe("No aplica");
    expect(getAplicacionLabel(null)).toBe("—");
  });
});
