import { estadoAsignacionAdmin } from "../inventarioAdmin";
import type { AsignacionAdmin } from "@/services/api/inventarioAdminApi";
const item:Pick<AsignacionAdmin,"estado"|"operario"|"devolucionPendiente"|"recepcionConfirmadaAt"|"ultimoConsumo">={estado:"asignado",operario:null,devolucionPendiente:false,recepcionConfirmadaAt:null,ultimoConsumo:null};
test("distingue supervisor, operario y recepción pendiente",()=>{
  expect(estadoAsignacionAdmin(item)).toBe("En poder del supervisor");
  const trabajador={id:"t",nombre:"Operario"};
  expect(estadoAsignacionAdmin({...item,operario:trabajador})).toBe("Recepción del operario pendiente");
  expect(estadoAsignacionAdmin({...item,operario:trabajador,recepcionConfirmadaAt:"2026-09-25"})).toBe("En poder del operario");
});
test("consumidos y devueltos no se presentan como custodia actual",()=>{
  expect(estadoAsignacionAdmin({...item,estado:"consumido",devolucionPendiente:true})).toBe("Consumido");
  expect(estadoAsignacionAdmin({...item,estado:"devuelto"})).toBe("Devuelto a bodega");
});
test("distingue destino de las devoluciones",()=>{
  expect(estadoAsignacionAdmin({...item,devolucionPendiente:true})).toBe("Devolución a bodega pendiente");
  expect(estadoAsignacionAdmin({...item,devolucionPendiente:true,operario:{id:"t",nombre:"Operario"}})).toBe("Devolución al supervisor pendiente");
});
