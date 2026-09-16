import { reconcileFirematProducts } from "../reconcileFirematProducts";
import type { FirematProducto } from "@/services/api/firematApi";

function product(id: number, changes: Partial<FirematProducto> = {}): FirematProducto {
  return {
    id, nombre: `Producto ${id}`, sku: String(id), descripcion: null, categoria: "Sellos",
    categoriaId: 1, precio: 100, precioUsd: null, precioSugerido: null, stockActual: 12,
    stockReservado: 0, stockDisponible: 12, stockMinimo: 1, ubicacion: null,
    criticidad: "Media", activo: true, imagen: null, estadoStock: "OK", alertaStockBajo: false,
    formato: null, cantidadCaja: null, disponibilidad: null, ...changes,
  };
}

test("refresh sin cambios conserva el arreglo y las tarjetas", () => {
  const previous = [product(1), product(2)];
  expect(reconcileFirematProducts(previous, [product(1), product(2)])).toBe(previous);
});

test("actualiza el stock cambiado y conserva referencias del resto", () => {
  const previous = [product(1), product(2)];
  const result = reconcileFirematProducts(previous, [product(1, { stockActual: 24, stockDisponible: 24 }), product(2)]);
  expect(result[0].stockDisponible).toBe(24);
  expect(result[0]).not.toBe(previous[0]);
  expect(result[1]).toBe(previous[1]);
});

test("respeta orden, altas, bajas y cambios en la foto del ajuste", () => {
  const previous = [product(1), product(2), product(3)];
  const result = reconcileFirematProducts(previous, [product(3), product(1, { imagen: "foto-nueva" }), product(4)]);
  expect(result.map((p) => p.id)).toEqual([3, 1, 4]);
  expect(result[0]).toBe(previous[2]);
  expect(result[1].imagen).toBe("foto-nueva");
});
