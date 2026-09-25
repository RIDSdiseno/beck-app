import { createSignatureStroke, type SignatureTouch } from "../signatureStroke";

const touch = (overrides: Partial<SignatureTouch> = {}): SignatureTouch => ({
  identifier: 1, pageX: 110, pageY: 420, locationX: 10, locationY: 20, ...overrides,
});

describe("captura de firma del cliente (Android e iOS)", () => {
  test("mantiene el origen aunque cambien las coordenadas locales del evento", () => {
    const stroke = createSignatureStroke();
    expect(stroke.start(touch())).toBe("M 10.0 20.0");
    expect(stroke.move([touch({ pageX: 125, pageY: 450, locationX: 2, locationY: 3 })]))
      .toBe("M 10.0 20.0 L 25.0 50.0");
    expect(stroke.finish([touch({ pageX: 130, pageY: 460 })]))
      .toBe("M 10.0 20.0 L 25.0 50.0 L 30.0 60.0");
  });

  test("no pierde puntos cuando llegan varios movimientos antes de redibujar", () => {
    const stroke = createSignatureStroke();
    stroke.start(touch());
    for (let i = 1; i <= 100; i++) stroke.move([touch({ pageX: 110 + i })]);
    const result = stroke.finish();
    expect(result.match(/ L /g)).toHaveLength(100);
    expect(result.endsWith("L 110.0 20.0")).toBe(true);
  });

  test("sigue el dedo original sin saltar al segundo dedo", () => {
    const stroke = createSignatureStroke();
    stroke.start(touch());
    const second = touch({ identifier: 2, pageX: 900, pageY: 900 });
    expect(stroke.move([second, touch({ pageX: 115 })])).toBe("M 10.0 20.0 L 15.0 20.0");
    expect(stroke.hasActiveTouch([second])).toBe(false);
    expect(stroke.finish([touch({ pageX: 120 })])).toBe("M 10.0 20.0 L 15.0 20.0 L 20.0 20.0");
    expect(stroke.move([second])).toBe("");
    expect(stroke.finish()).toBe("");
  });

  test("una interrupción conserva el trazo y la siguiente firma tiene un origen nuevo", () => {
    const stroke = createSignatureStroke();
    stroke.start(touch());
    stroke.move([touch({ pageX: 115 })]);
    expect(stroke.finish()).toBe("M 10.0 20.0 L 15.0 20.0");
    stroke.start(touch({ pageX: 200, pageY: 500, locationX: 5, locationY: 6 }));
    expect(stroke.finish([touch({ pageX: 210, pageY: 510 })])).toBe("M 5.0 6.0 L 15.0 16.0");
  });

  test("limpiar elimina el trazo activo y no permite recuperarlo al soltar", () => {
    const stroke = createSignatureStroke();
    stroke.start(touch());
    stroke.move([touch({ pageX: 130 })]);
    stroke.clear();
    expect(stroke.hasActiveTouch([touch()])).toBe(false);
    expect(stroke.finish([touch({ pageX: 140 })])).toBe("");
  });

  test("un toque sin movimiento o eventos inválidos no generan una firma", () => {
    const stroke = createSignatureStroke();
    stroke.start(touch());
    stroke.move([touch({ pageX: NaN })]);
    expect(stroke.finish([touch()])).toBe("");
    expect(stroke.start(touch({ locationY: Infinity }))).toBe("");
    expect(stroke.finish()).toBe("");
  });
});
