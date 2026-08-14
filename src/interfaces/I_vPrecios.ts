import Cl_mPrecio from "../models/Cl_mPrecio.js";

export interface I_vPrecios {
  obtenerDatosFormulario(): { producto: string; precioUsd: number } | null;
  limpiarFormulario(): void;
  cargarFormularioEdicion(precio: Cl_mPrecio): void;
  cancelarModoEdicion(): void;
  renderizarTasaBCV(tasa: number): void;
  renderizarListaPrecios(precios: Cl_mPrecio[], tasaCambio: number): void;
  renderizarResumenTotales(datos: {
    totalUsd: number;
    totalBs: number;
    cantidad: number;
    promedioUsd: number;
    maxUsd: number;
    minUsd: number;
  }): void;
  mostrarSpinner(): void;
  ocultarSpinner(): void;
  mostrarToast(mensaje: string, tipo?: "exito" | "error" | "info"): void;
  onAgregarPrecio(callback: (datos: { producto: string; precioUsd: number }) => void): void;
  onEditarPrecio(callback: (id: string, datos: { producto: string; precioUsd: number }) => void): void;
  onEliminarPrecio(callback: (id: string) => void): void;
  onActualizarTasaManual(callback: (nuevaTasa: number) => void): void;
}
