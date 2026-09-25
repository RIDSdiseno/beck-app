import {
  ACCESIBILIDAD_OPTIONS,
  getAccesibilidadLabel,
  getAislacionLabel,
  getAislacionOption,
  getAplicacionLabel,
} from "../factoresRegistro";

describe("factores de registro", () => {
  it("muestra la accesibilidad resuelta por obra sin sustituirla por el nivel", () => {
    expect(getAccesibilidadLabel({ accesibilidad: 2, accesibilidadTexto: "Cielos Americanos o estructurado - Factor 1.25" })).toBe("Cielos Americanos o estructurado - Factor 1.25");
    expect(getAccesibilidadLabel({ accesibilidad: 1, accesibilidadTexto: "Accesibilidad normal - Factor 3.0" })).toBe("Accesibilidad normal - Factor 3.0");
  });
  it("no inventa el factor al recibir una respuesta de un backend anterior", () => {
    expect(getAccesibilidadLabel({ accesibilidad: 2 })).toBe("Cielos Americanos o estructurado - Factor no disponible");
    expect(getAccesibilidadLabel({ accesibilidad: 0 })).toBe("No aplica - Factor 1.0");
    expect(getAccesibilidadLabel({ accesibilidad: null })).toBe("—");
    expect(getAccesibilidadLabel({ accesibilidad: 8 })).toBe("Accesibilidad no identificada");
  });
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
