import { filtrarItemizados, opcionesFiltroItemizado } from "../itemizadoFiltros";

const items = [
  { codigo_beck: "1-170", tipo: "Metálica", elemento_pasante: "Tubería metálica de Ø ≤ 25 mm", elemento_penetra: "Muro", materialidad: "Tabique" },
  { codigo_beck: "2-184", tipo: "No metálica", elemento_pasante: "Tubería no metálica de Ø ≤ 110 mm", elemento_penetra: "Muro", materialidad: "tabique " },
  { codigo_beck: "2-188", tipo: "No metálica", elemento_pasante: "Tubería no metálica de Ø ≤ 110 mm", elemento_penetra: "Losa", materialidad: "Hormigón" },
  { codigo_beck: "7-100", tipo: "HVAC", elemento_pasante: "HVAC de 200 x 200 mm o menor", elemento_penetra: null, materialidad: null },
];

test("las opciones salen solo de los itemizados de la obra, sin repetir mayúsculas ni espacios", () => {
  const { tipos, elementosPenetra, materialidades } = opcionesFiltroItemizado(items, {});
  expect(tipos.map((o) => o.label)).toEqual(["HVAC", "Metálica", "No metálica"]);
  expect(elementosPenetra.map((o) => o.label)).toEqual(["Losa", "Muro"]);
  expect(materialidades.map((o) => o.label)).toEqual(["Hormigón", "Tabique"]);
});

test("la materialidad se acota al elemento atravesado elegido", () => {
  expect(opcionesFiltroItemizado(items, { elementoPenetra: "losa" }).materialidades.map((o) => o.label)).toEqual(["Hormigón"]);
});

test("combina elemento atravesado, materialidad y texto", () => {
  expect(filtrarItemizados(items, { texto: "", elementoPenetra: "muro", materialidad: "tabique" }).map((i) => i.codigo_beck))
    .toEqual(["1-170", "2-184"]);
  expect(filtrarItemizados(items, { texto: "no metalica", elementoPenetra: "muro", materialidad: "" }).map((i) => i.codigo_beck))
    .toEqual(["2-184"]);
  expect(filtrarItemizados(items, { texto: "7-100", elementoPenetra: "", materialidad: "" }).map((i) => i.codigo_beck))
    .toEqual(["7-100"]);
});

test("el tipo acota elementos atravesados y materialidades, y filtra la lista", () => {
  const opciones = opcionesFiltroItemizado(items, { tipo: "metálica" });
  expect(opciones.elementosPenetra.map((o) => o.label)).toEqual(["Muro"]);
  expect(opciones.materialidades.map((o) => o.label)).toEqual(["Tabique"]);
  expect(filtrarItemizados(items, { texto: "", tipo: "no metálica", elementoPenetra: "", materialidad: "" }).map((i) => i.codigo_beck))
    .toEqual(["2-184", "2-188"]);
});
