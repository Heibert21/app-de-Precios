import { I_vPrecios } from "../interfaces/I_vPrecios.js";
import Cl_mAppPrecios from "../models/Cl_mAppPrecios.js";
import Cl_mPrecio from "../models/Cl_mPrecio.js";
import Cl_sDolar from "../services/Cl_sDolar.js";

export default class Cl_cPrecios {
  private vista: I_vPrecios;
  private modelo: Cl_mAppPrecios;

  constructor({ modelo, vista }: { modelo: Cl_mAppPrecios; vista: I_vPrecios }) {
    this.modelo = modelo;
    this.vista = vista;

    this.inicializarApp();
    this.registrarEventos();
  }

  private async inicializarApp(): Promise<void> {
    this.vista.mostrarSpinner();

    // 1. Cargar precios desde MockAPI / localStorage
    try {
      const guardados = await Cl_sDolar.cargarPrecios();
      this.modelo.setPrecios(guardados);
    } catch (error) {
      console.error("Error al cargar lista inicial:", error);
    }

    // 2. Obtener Tasa de Cambio del día (BCV)
    try {
      const tasa = await Cl_sDolar.obtenerTasaBcv();
      this.modelo.tasaCambio = tasa;
      this.vista.mostrarToast(`Tasa BCV del día actualizada: Bs. ${tasa.toFixed(2)}`, "exito");
    } catch {
      this.vista.mostrarToast("No se pudo conectar a la API del BCV. Usando tasa por defecto (Bs. 36.50). Puedes cambiarla arriba.", "error");
      this.modelo.tasaCambio = 36.50;
    } finally {
      this.vista.ocultarSpinner();
      this.actualizarUI();
    }
  }

  private registrarEventos(): void {
    // Evento Agregar Nuevo Precio
    this.vista.onAgregarPrecio(async (datos) => {
      this.vista.mostrarSpinner();
      const nuevoPrecio = new Cl_mPrecio({
        producto: datos.producto,
        precioUsd: datos.precioUsd
      });

      try {
        const res = await Cl_sDolar.guardarNuevoPrecio(nuevoPrecio.toJSON());
        if (res.itemGuardado) {
          const itemModelo = new Cl_mPrecio(res.itemGuardado);
          this.modelo.agregarPrecio(itemModelo);
        } else {
          this.modelo.agregarPrecio(nuevoPrecio);
        }
        this.actualizarUI();
        this.vista.limpiarFormulario();
        this.vista.mostrarToast("Precio registrado con éxito.", "exito");
      } catch {
        this.vista.mostrarToast("Error al guardar el precio.", "error");
      } finally {
        this.vista.ocultarSpinner();
      }
    });

    // Evento Editar Precio Existente
    this.vista.onEditarPrecio(async (id, datos) => {
      this.vista.mostrarSpinner();
      try {
        const res = await Cl_sDolar.actualizarPrecioItem(id, datos);
        this.modelo.editarPrecio(id, datos.producto, datos.precioUsd);
        this.actualizarUI();
        this.vista.cancelarModoEdicion();
        this.vista.mostrarToast(res.mensaje || "Precio actualizado correctamente.", "exito");
      } catch {
        this.vista.mostrarToast("Error al actualizar el precio.", "error");
      } finally {
        this.vista.ocultarSpinner();
      }
    });

    // Evento Eliminar Precio
    this.vista.onEliminarPrecio(async (id) => {
      if (!confirm("¿Está seguro de eliminar este producto del catálogo?")) return;
      
      this.vista.mostrarSpinner();
      try {
        await Cl_sDolar.eliminarPrecioItem(id);
        this.modelo.eliminarPrecio(id);
        this.actualizarUI();
        this.vista.mostrarToast("Precio eliminado.", "info");
      } catch {
        this.vista.mostrarToast("Error al eliminar el precio.", "error");
      } finally {
        this.vista.ocultarSpinner();
      }
    });

    // Evento Actualizar Tasa Manualmente
    this.vista.onActualizarTasaManual((nuevaTasa) => {
      this.modelo.tasaCambio = nuevaTasa;
      this.actualizarUI();
      this.vista.mostrarToast(`Tasa de cambio actualizada a Bs. ${nuevaTasa.toFixed(2)}`, "exito");
    });
  }

  private actualizarUI(): void {
    this.vista.renderizarTasaBCV(this.modelo.tasaCambio);
    this.vista.renderizarListaPrecios(this.modelo.precios, this.modelo.tasaCambio);
    this.vista.renderizarResumenTotales({
      totalUsd: this.modelo.calcularTotalUsd(),
      totalBs: this.modelo.calcularTotalBs(),
      cantidad: this.modelo.cantidadPrecios(),
      promedioUsd: this.modelo.calcularPromedioUsd(),
      maxUsd: this.modelo.obtenerPrecioMaximoUsd(),
      minUsd: this.modelo.obtenerPrecioMinimoUsd()
    });
  }
}
