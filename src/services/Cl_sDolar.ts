import Cl_sMockApi from "./Cl_sMockApi.js";

export default class Cl_sDolar extends Cl_sMockApi {
  private static readonly STORAGE_KEY = "appPrecios_lista_v1";

  /**
   * Obtiene la tasa oficial del día desde la API pública de BCV (DolarAPI)
   */
  public static async obtenerTasaBcv(): Promise<number> {
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      if (data && typeof data.promedio === "number" && data.promedio > 0) {
        return data.promedio;
      }
      throw new Error("Datos de tasa inválidos");
    } catch (error) {
      console.warn("Fallo al obtener la tasa automáticamente de la API:", error);
      throw error;
    }
  }

  /**
   * Carga los precios guardados (Prueba primero desde MockAPI, fallback a localStorage)
   */
  public static async cargarPrecios(): Promise<any[]> {
    // 1. Intentar cargar desde MockAPI si hay URL configurada
    const resMock = await super.getTabla({ tabla: "precios" });
    if (resMock.ok && resMock.tabla && resMock.tabla.length > 0) {
      return resMock.tabla;
    }

    // 2. Fallback local a localStorage
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error al cargar de localStorage:", error);
      return [];
    }
  }

  /**
   * Guarda un nuevo precio (en MockAPI y localStorage)
   */
  public static async guardarNuevoPrecio(precioItem: any): Promise<{ ok: boolean; mensaje: string; itemGuardado?: any }> {
    // 1. Intentar guardar en MockAPI
    const resMock = await super.agregar(precioItem, "precios");

    // 2. Guardar copia local en localStorage siempre
    const locales = this.cargarPreciosLocales();
    const itemFinal = { ...precioItem, id: resMock.id || precioItem.id || Date.now().toString() };
    locales.unshift(itemFinal);
    this.guardarPreciosLocales(locales);

    return {
      ok: true,
      mensaje: resMock.ok ? "Guardado en MockAPI y Local" : "Guardado en almacenamiento local",
      itemGuardado: itemFinal
    };
  }

  /**
   * Modifica / Actualiza un precio existente (en MockAPI y localStorage)
   */
  public static async actualizarPrecioItem(id: string, datos: any): Promise<{ ok: boolean; mensaje: string }> {
    // 1. Actualizar en MockAPI
    const resMock = await super.modificar(id, datos, "precios");

    // 2. Actualizar en localStorage
    const locales = this.cargarPreciosLocales().map((item: any) => {
      if (String(item.id) === String(id)) {
        return { ...item, ...datos };
      }
      return item;
    });
    this.guardarPreciosLocales(locales);

    return {
      ok: true,
      mensaje: resMock.ok ? "Actualizado en MockAPI y Local" : "Actualizado en almacenamiento local"
    };
  }

  /**
   * Elimina un precio (en MockAPI y localStorage)
   */
  public static async eliminarPrecioItem(id: string): Promise<void> {
    // 1. Eliminar de MockAPI
    await super.eliminar(id, "precios");

    // 2. Eliminar de localStorage
    const locales = this.cargarPreciosLocales().filter((item: any) => String(item.id) !== String(id));
    this.guardarPreciosLocales(locales);
  }

  public static cargarPreciosLocales(): any[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static guardarPreciosLocales(precios: any[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(precios));
    } catch (error) {
      console.error("Error al guardar en localStorage:", error);
    }
  }
}
