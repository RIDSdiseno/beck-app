export type SignatureTouch = {
  identifier: string | number;
  pageX: number;
  pageY: number;
  locationX: number;
  locationY: number;
};

// El origen queda fijado al iniciar el trazo. Las coordenadas locales de los
// eventos posteriores pueden cambiar de referencia al tocar un hijo del lienzo.
export function createSignatureStroke() {
  let touchId: string | number | null = null;
  let originX = 0;
  let originY = 0;
  let path = "";
  let lastPoint = "";

  const clear = () => { touchId = null; path = ""; lastPoint = ""; };
  const move = (touches: readonly SignatureTouch[]) => {
    if (touchId === null) return path;
    const touch = touches.find(t => t.identifier === touchId);
    if (!touch || !Number.isFinite(touch.pageX) || !Number.isFinite(touch.pageY)) return path;
    const point = `${(touch.pageX - originX).toFixed(1)} ${(touch.pageY - originY).toFixed(1)}`;
    if (point !== lastPoint) { path += ` L ${point}`; lastPoint = point; }
    return path;
  };
  return {
    start(touch: SignatureTouch) {
      clear();
      if (![touch.pageX, touch.pageY, touch.locationX, touch.locationY].every(Number.isFinite)) return "";
      touchId = touch.identifier;
      originX = touch.pageX - touch.locationX;
      originY = touch.pageY - touch.locationY;
      lastPoint = `${touch.locationX.toFixed(1)} ${touch.locationY.toFixed(1)}`;
      path = `M ${lastPoint}`;
      return path;
    },
    move,
    hasActiveTouch: (touches: readonly SignatureTouch[]) => touches.some(t => t.identifier === touchId),
    finish(touches: readonly SignatureTouch[] = []) {
      move(touches);
      // Un toque sin desplazamiento no debe habilitar la validación de una firma.
      const result = path.includes(" L ") ? path : "";
      clear();
      return result;
    },
    clear,
  };
}
