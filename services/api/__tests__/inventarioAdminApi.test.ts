import { authenticatedFetch } from "../authenticatedFetch";
import { getSession, type SessionUser } from "@/services/auth/session";
import { consultarInventarioAdmin, puedeConsultarInventarioAdmin } from "../inventarioAdminApi";
jest.mock("../config",()=>({API_BASE_URL:"https://example.test",readJsonResponse:async(r:{json:()=>Promise<unknown>})=>r.json()}));
jest.mock("../authenticatedFetch",()=>({authenticatedFetch:jest.fn()}));
jest.mock("@/services/auth/session",()=>({getSession:jest.fn()}));
const user:SessionUser={id:"admin",nombre:"Administrador",email:"admin@becksoluciones.cl",rol:"administrador",empresa:"beck"};
beforeEach(()=>{jest.clearAllMocks();(getSession as jest.Mock).mockResolvedValue({token:"test-token",user});(authenticatedFetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({success:true,data:[]})});});
test("acceso solo para el administrador BECK",()=>{
  expect(puedeConsultarInventarioAdmin(user)).toBe(true);
  expect(puedeConsultarInventarioAdmin({...user,empresa:"firemat"})).toBe(false);
  expect(puedeConsultarInventarioAdmin(null)).toBe(false);
  for(const rol of ["terreno","jefeobra","ingenieria","cliente","bodeguero"])expect(puedeConsultarInventarioAdmin({...user,rol})).toBe(false);
});
test("solo envía GET, mantiene el token y permite cancelar consultas",async()=>{
  const signal=new AbortController().signal;
  await consultarInventarioAdmin("/obras",signal);
  expect(authenticatedFetch).toHaveBeenCalledWith("https://example.test/api/admin/inventario-beck/obras",{signal,method:"GET",headers:{Authorization:"Bearer test-token"}});
});
test("no consulta si la sesión no está autorizada",async()=>{
  (getSession as jest.Mock).mockResolvedValue({token:"test-token",user:{...user,rol:"jefeobra"}});
  await expect(consultarInventarioAdmin("/obras")).rejects.toThrow("exclusivo");
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
test("propaga el error del servidor",async()=>{
  (authenticatedFetch as jest.Mock).mockResolvedValue({ok:false,json:async()=>({success:false,error:"Sin permiso"})});
  await expect(consultarInventarioAdmin("/obras")).rejects.toThrow("Sin permiso");
});
