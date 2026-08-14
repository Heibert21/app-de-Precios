import { I_vPrecios } from "../interfaces/I_vPrecios.js";
import Cl_mPrecio from "../models/Cl_mPrecio.js";

export default class Cl_vPrecios implements I_vPrecios {
  private loader: HTMLElement;
  private tasaValorEl: HTMLElement;
  private constBtnEditTasa: HTMLElement | null;
  private formPrecio: HTMLFormElement;
  private tituloForm: HTMLElement;
  private inProducto: HTMLInputElement;
  private inPrecioUsd: HTMLInputElement;
  private btnSubmit: HTMLButtonElement;
  private btnCancelarEdicion: HTMLButtonElement;
  private listaPreciosEl: HTMLElement;
  private contadorItems: HTMLElement;
  private emptyState: HTMLElement;
  private toastContainer: HTMLElement;

  // Nuevos controles de UI
  private inputBuscar: HTMLInputElement | null;
  private selectOrden: HTMLSelectElement | null;
  private btnExportarPdf: HTMLButtonElement | null;

  // Cotizador Rápido
  private cotizacionBar: HTMLElement | null;
  private cotizacionCantNum: HTMLElement | null;
  private cotizacionTotalUsd: HTMLElement | null;
  private cotizacionTotalBs: HTMLElement | null;
  private btnEnviarWhatsapp: HTMLButtonElement | null;
  private btnLimpiarSeleccion: HTMLButtonElement | null;
  private seleccionadosQuote: Map<string, Cl_mPrecio> = new Map();

  // Estado interno de vista
  private editandoId: string | null = null;
  private textoBusqueda: string = "";
  private ordenActivo: string = "recientes";
  private preciosCache: Cl_mPrecio[] = [];
  private tasaActualCache: number = 0;

  // Callbacks de Eventos
  private cbAgregarPrecio?: (datos: { producto: string; precioUsd: number }) => void;
  private cbEditarPrecio?: (id: string, datos: { producto: string; precioUsd: number }) => void;
  private cbEliminarPrecio?: (id: string) => void;
  private cbActualizarTasaManual?: (nuevaTasa: number) => void;

  constructor() {
    this.loader = document.getElementById("loader") as HTMLElement;
    this.tasaValorEl = document.getElementById("tasa-valor") as HTMLElement;
    this.constBtnEditTasa = document.getElementById("btn-edit-tasa");
    this.formPrecio = document.getElementById("form-precio") as HTMLFormElement;
    this.tituloForm = document.getElementById("titulo-form") as HTMLElement || this.formPrecio.previousElementSibling;
    this.inProducto = document.getElementById("producto") as HTMLInputElement;
    this.inPrecioUsd = document.getElementById("precio-usd") as HTMLInputElement;
    this.btnSubmit = this.formPrecio.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Crear o referenciar botón de cancelar edición
    let btnCancel = document.getElementById("btn-cancelar-edicion") as HTMLButtonElement;
    if (!btnCancel) {
      btnCancel = document.createElement("button");
      btnCancel.type = "button";
      btnCancel.id = "btn-cancelar-edicion";
      btnCancel.className = "btn-secundario oculto";
      btnCancel.textContent = "✖ Cancelar";
      btnCancel.style.marginTop = "8px";
      this.btnSubmit.after(btnCancel);
    }
    this.btnCancelarEdicion = btnCancel;

    this.listaPreciosEl = document.getElementById("lista-precios") as HTMLElement;
    this.contadorItems = document.getElementById("contador-items") as HTMLElement;
    this.emptyState = document.getElementById("empty-state") as HTMLElement;

    // Referencias a los nuevos controles
    this.inputBuscar = document.getElementById("buscar-input") as HTMLInputElement;
    this.selectOrden = document.getElementById("select-orden") as HTMLSelectElement;
    this.btnExportarPdf = document.getElementById("btn-exportar-pdf") as HTMLButtonElement;

    // Cotizador bar
    this.cotizacionBar = document.getElementById("cotizacion-bar");
    this.cotizacionCantNum = document.getElementById("cotizacion-cant-num");
    this.cotizacionTotalUsd = document.getElementById("cotizacion-total-usd");
    this.cotizacionTotalBs = document.getElementById("cotizacion-total-bs");
    this.btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp") as HTMLButtonElement;
    this.btnLimpiarSeleccion = document.getElementById("btn-limpiar-seleccion") as HTMLButtonElement;

    // Contenedor Toasts
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    this.toastContainer = container;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Evento Formulario Submit
    this.formPrecio.addEventListener("submit", (e) => {
      e.preventDefault();
      const datos = this.obtenerDatosFormulario();
      if (!datos) return;

      if (this.editandoId && this.cbEditarPrecio) {
        this.cbEditarPrecio(this.editandoId, datos);
      } else if (this.cbAgregarPrecio) {
        this.cbAgregarPrecio(datos);
      }
    });

    // Cancelar Edición
    this.btnCancelarEdicion.addEventListener("click", () => {
      this.cancelarModoEdicion();
    });

    // Evento Editar Tasa Manual
    if (this.constBtnEditTasa) {
      this.constBtnEditTasa.addEventListener("click", () => {
        const input = prompt("Ingrese la nueva tasa de cambio en Bolívares (Bs.):");
        if (input !== null) {
          const val = parseFloat(input);
          if (!isNaN(val) && val > 0 && this.cbActualizarTasaManual) {
            this.cbActualizarTasaManual(val);
          } else {
            this.mostrarToast("Por favor ingrese un número válido.", "error");
          }
        }
      });
    }

    // Evento Búsqueda en tiempo real
    if (this.inputBuscar) {
      this.inputBuscar.addEventListener("input", () => {
        this.textoBusqueda = this.inputBuscar?.value.trim().toLowerCase() || "";
        this.refrescarListaPrecios();
      });
    }

    // Evento Cambio de Orden
    if (this.selectOrden) {
      this.selectOrden.addEventListener("change", () => {
        this.ordenActivo = this.selectOrden?.value || "recientes";
        this.refrescarListaPrecios();
      });
    }

    // Evento Descargar PDF
    if (this.btnExportarPdf) {
      this.btnExportarPdf.addEventListener("click", () => {
        this.descargarPDF();
      });
    }

    // Evento Enviar por WhatsApp
    if (this.btnEnviarWhatsapp) {
      this.btnEnviarWhatsapp.addEventListener("click", () => {
        this.enviarPresupuestoWhatsApp();
      });
    }

    // Evento Limpiar Selección
    if (this.btnLimpiarSeleccion) {
      this.btnLimpiarSeleccion.addEventListener("click", () => {
        this.limpiarSeleccion();
      });
    }

    // Delegación de eventos para editar, eliminar y selección de checkboxes (cotizador)
    this.listaPreciosEl.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      // Click Editar
      const btnEdit = target.closest(".btn-editar") as HTMLButtonElement;
      if (btnEdit && btnEdit.dataset.id) {
        const id = btnEdit.dataset.id;
        const nombre = btnEdit.dataset.nombre || "";
        const precioUsd = parseFloat(btnEdit.dataset.precio || "0");
        this.cargarFormularioEdicion(new Cl_mPrecio({ id, producto: nombre, precioUsd }));
        return;
      }

      // Click Eliminar
      const btnDel = target.closest(".btn-eliminar") as HTMLButtonElement;
      if (btnDel && btnDel.dataset.id && this.cbEliminarPrecio) {
        this.cbEliminarPrecio(btnDel.dataset.id);
        return;
      }
    });

    // Delegar evento change para checkboxes del cotizador
    this.listaPreciosEl.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.classList.contains("checkbox-item")) {
        const id = target.dataset.id;
        if (!id) return;

        if (target.checked) {
          const item = this.preciosCache.find(p => String(p.id) === String(id));
          if (item) this.seleccionadosQuote.set(id, item);
        } else {
          this.seleccionadosQuote.delete(id);
        }
        this.actualizarBarraCotizacion();
      }
    });
  }

  public obtenerDatosFormulario(): { producto: string; precioUsd: number } | null {
    const producto = this.inProducto.value.trim();
    const precioUsd = parseFloat(this.inPrecioUsd.value);

    if (!producto) {
      this.mostrarToast("Ingrese la descripción del producto o reparación.", "error");
      this.inProducto.focus();
      return null;
    }

    if (isNaN(precioUsd) || precioUsd <= 0) {
      this.mostrarToast("Ingrese un monto en dólares válido mayor a 0.", "error");
      this.inPrecioUsd.focus();
      return null;
    }

    return { producto, precioUsd };
  }

  public cargarFormularioEdicion(precio: Cl_mPrecio): void {
    this.editandoId = precio.id;
    this.inProducto.value = precio.producto;
    this.inPrecioUsd.value = precio.precioUsd.toString();

    if (this.tituloForm) this.tituloForm.textContent = "✏️ Editar Precio de Reparación";
    this.btnSubmit.textContent = "💾 Actualizar Cambios";
    this.btnCancelarEdicion.classList.remove("oculto");

    this.inProducto.focus();
    window.scrollTo({ top: this.formPrecio.offsetTop - 120, behavior: "smooth" });
  }

  public cancelarModoEdicion(): void {
    this.editandoId = null;
    this.limpiarFormulario();
    if (this.tituloForm) this.tituloForm.textContent = "📝 Registrar Precio de Reparación";
    this.btnSubmit.textContent = "💾 Guardar Precio";
    this.btnCancelarEdicion.classList.add("oculto");
  }

  public limpiarFormulario(): void {
    this.formPrecio.reset();
  }

  public renderizarTasaBCV(tasa: number): void {
    this.tasaActualCache = tasa;
    this.tasaValorEl.textContent = `Bs. ${tasa.toFixed(2)}`;
  }

  public renderizarListaPrecios(precios: Cl_mPrecio[], tasaCambio: number): void {
    this.preciosCache = precios;
    this.tasaActualCache = tasaCambio;
    this.refrescarListaPrecios();
  }

  private refrescarListaPrecios(): void {
    let filtrados = [...this.preciosCache];

    // 1. Filtrar por texto de búsqueda
    if (this.textoBusqueda) {
      filtrados = filtrados.filter((p) =>
        p.producto.toLowerCase().includes(this.textoBusqueda)
      );
    }

    // 2. Aplicar Ordenamiento
    if (this.ordenActivo === "precio-asc") {
      filtrados.sort((a, b) => a.precioUsd - b.precioUsd);
    } else if (this.ordenActivo === "precio-desc") {
      filtrados.sort((a, b) => b.precioUsd - a.precioUsd);
    } else if (this.ordenActivo === "nombre-asc") {
      filtrados.sort((a, b) => a.producto.localeCompare(b.producto));
    } else if (this.ordenActivo === "nombre-desc") {
      filtrados.sort((a, b) => b.producto.localeCompare(a.producto));
    }

    this.contadorItems.textContent = filtrados.length.toString();

    if (filtrados.length === 0) {
      this.emptyState.style.display = "flex";
      this.listaPreciosEl.innerHTML = "";
      this.listaPreciosEl.appendChild(this.emptyState);
      return;
    }

    this.emptyState.style.display = "none";
    this.listaPreciosEl.innerHTML = "";

    filtrados.forEach((item) => {
      const precioBs = item.calcularPrecioBs(this.tasaActualCache);
      const isChecked = this.seleccionadosQuote.has(String(item.id));

      const div = document.createElement("div");
      div.className = "precio-item";
      div.innerHTML = `
        <div class="checkbox-item-container">
          <input type="checkbox" class="checkbox-item" data-id="${item.id}" ${isChecked ? "checked" : ""} title="Seleccionar para cotización" />
        </div>
        <div class="item-info">
          <span class="item-nombre">${this.escapeHtml(item.producto)}</span>
          <div class="item-monedas">
            <span class="item-usd">$${item.precioUsd.toFixed(2)}</span>
            <span class="item-bs">Bs. ${precioBs.toFixed(2)}</span>
          </div>
        </div>
        <div class="item-acciones">
          <button class="btn-editar" data-id="${item.id}" data-nombre="${this.escapeHtml(item.producto)}" data-precio="${item.precioUsd}" title="Editar Producto">
            ✏️
          </button>
          <button class="btn-eliminar" data-id="${item.id}" title="Eliminar Producto">
            🗑️
          </button>
        </div>
      `;
      this.listaPreciosEl.appendChild(div);
    });
  }

  private limpiarSeleccion(): void {
    this.seleccionadosQuote.clear();
    // Desmarcar todos los checkboxes visibles
    const checkboxes = this.listaPreciosEl.querySelectorAll<HTMLInputElement>(".checkbox-item");
    checkboxes.forEach(cb => { cb.checked = false; });
    this.actualizarBarraCotizacion();
    this.mostrarToast("Selección limpiada.", "info");
  }

  private actualizarBarraCotizacion(): void {
    if (!this.cotizacionBar) return;

    const totalItems = this.seleccionadosQuote.size;
    if (totalItems === 0) {
      this.cotizacionBar.classList.add("oculto");
      return;
    }

    this.cotizacionBar.classList.remove("oculto");
    if (this.cotizacionCantNum) this.cotizacionCantNum.textContent = totalItems.toString();

    let totalUsd = 0;
    this.seleccionadosQuote.forEach((item) => {
      totalUsd += item.precioUsd;
    });

    const totalBs = totalUsd * this.tasaActualCache;

    if (this.cotizacionTotalUsd) this.cotizacionTotalUsd.textContent = `$${totalUsd.toFixed(2)}`;
    if (this.cotizacionTotalBs) this.cotizacionTotalBs.textContent = `Bs. ${totalBs.toFixed(2)}`;
  }

  private descargarPDF(): void {
    if (this.preciosCache.length === 0) {
      this.mostrarToast("No hay precios en el cat\u00e1logo para exportar.", "error");
      return;
    }

    const { jsPDF } = (window as any).jspdf;

    const W       = 90;
    const mg      = 6;
    const cw      = W - mg * 2;
    const rowH    = 17;
    const headerH = 42;
    const footerH = 34;
    const H = headerH + (this.preciosCache.length * rowH) + 28 + footerH;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });

    const hoy = new Date().toLocaleDateString("es-VE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    type RGB = [number, number, number];
    const navy:     RGB = [15,  23,  42];
    const azul:     RGB = [2,  132, 199];
    const azulClr:  RGB = [56, 189, 248];
    const verde:    RGB = [16, 185, 129];
    const verdeClr: RGB = [167,243,208];
    const gris:     RGB = [100,116,139];
    const grisClr:  RGB = [226,232,240];
    const grisBg:   RGB = [248,250,252];
    const blanco:   RGB = [255,255,255];
    const dorado:   RGB = [251,191, 36];

    let y = 0;

    // =========== HEADER ===========
    // Fondo navy completo
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, headerH, "F");
    // Barra lateral azul
    doc.setFillColor(...azul);
    doc.rect(0, 0, 4, headerH, "F");
    // Franja dorada inferior del header
    doc.setFillColor(...dorado);
    doc.rect(0, headerH - 2, W, 2, "F");
    // Circulo logo "TR"
    doc.setFillColor(...azulClr);
    doc.circle(16, 14, 7, "F");
    doc.setTextColor(...navy);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TR", 16, 16.5, { align: "center" });
    // Titulo
    doc.setTextColor(...blanco);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LISTA DE PRECIOS", 26, 11);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...azulClr);
    doc.text("Taller de Reparaciones", 26, 17);
    // Chips Fecha / Tasa
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(mg, 23, (cw / 2) - 1, 11, 2, 2, "F");
    doc.roundedRect(mg + (cw / 2) + 1, 23, (cw / 2) - 1, 11, 2, 2, "F");
    // Chip fecha
    doc.setTextColor(...gris);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text("FECHA", mg + (cw / 4), 27, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blanco);
    doc.text(hoy, mg + (cw / 4), 31.5, { align: "center" });
    // Chip tasa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...gris);
    doc.text("TASA BCV", mg + (cw * 3 / 4) + 1, 27, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dorado);
    doc.text(`Bs. ${this.tasaActualCache.toFixed(2)}`, mg + (cw * 3 / 4) + 1, 31.5, { align: "center" });

    y = headerH + 5;

    // =========== FILAS DE PRECIOS ===========
    this.preciosCache.forEach((item, index) => {
      const esPar = index % 2 === 0;
      // Fondo alterno
      if (esPar) {
        doc.setFillColor(...grisBg);
        doc.rect(mg, y - 1.5, cw, rowH - 0.5, "F");
      }
      // Borde lateral de color
      doc.setFillColor(...(esPar ? azul : verde));
      doc.rect(mg, y - 1.5, 2.5, rowH - 0.5, "F");
      // Numero
      doc.setTextColor(...gris);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`#${index + 1}`, mg + 4.5, y + 2.5);
      // Nombre
      doc.setTextColor(...navy);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const nombre = item.producto.length > 27 ? item.producto.substring(0, 27) + "\u2026" : item.producto;
      doc.text(nombre, mg + 4.5, y + 8.5);
      // Chip USD
      const bs = item.calcularPrecioBs(this.tasaActualCache);
      doc.setFillColor(...azul);
      doc.roundedRect(mg + 4, y + 10, 23, 5, 1.5, 1.5, "F");
      doc.setTextColor(...blanco);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`$ ${item.precioUsd.toFixed(2)}`, mg + 15.5, y + 14, { align: "center" });
      // Chip Bs
      doc.setFillColor(...verde);
      doc.roundedRect(W - mg - 29, y + 10, 29, 5, 1.5, 1.5, "F");
      doc.setTextColor(...blanco);
      doc.text(`Bs. ${bs.toFixed(2)}`, W - mg - 14.5, y + 14, { align: "center" });
      // Linea separadora sutil
      doc.setDrawColor(...grisClr);
      doc.setLineWidth(0.15);
      doc.line(mg, y + rowH - 2, W - mg, y + rowH - 2);

      y += rowH;
    });

    // =========== TOTAL ===========
    y += 4;
    // Linea punteada decorativa
    doc.setDrawColor(...grisClr);
    doc.setLineWidth(0.2);
    for (let x = mg; x < W - mg; x += 3.5) {
      doc.line(x, y, x + 2, y);
    }
    y += 6;

    const totalUsd = this.preciosCache.reduce((a, p) => a + p.precioUsd, 0);
    const totalBs  = totalUsd * this.tasaActualCache;

    // Caja de total estilo premium
    doc.setFillColor(...navy);
    doc.roundedRect(mg, y, cw, 15, 3, 3, "F");
    // Acento lateral azul
    doc.setFillColor(...azul);
    doc.roundedRect(mg, y, 4, 15, 2, 2, "F");
    // Label
    doc.setTextColor(...gris);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL DEL CATALOGO", mg + 7, y + 5.5);
    // Montos
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azulClr);
    doc.text(`$${totalUsd.toFixed(2)}`, mg + 7, y + 12);
    doc.setTextColor(...verdeClr);
    doc.text(`Bs. ${totalBs.toFixed(2)}`, W - mg, y + 12, { align: "right" });
    y += 22;

    // =========== FOOTER ===========
    doc.setFillColor(...grisBg);
    doc.rect(0, y, W, footerH, "F");
    // Linea azul superior del footer
    doc.setFillColor(...azul);
    doc.rect(0, y, W, 1.8, "F");
    y += 8;
    doc.setTextColor(...navy);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Metodos de Pago", W / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text("Efectivo  /  Pago Movil", W / 2, y, { align: "center" });
    y += 5.5;
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Garantia: 30 dias", W / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text("Calle 33 con Carrera 23", W / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "italic");
    doc.text("* Precios en USD. Bs. sujetos a tasa BCV del dia del pago *", W / 2, y, { align: "center" });

    doc.save(`Precios-Reparacion-${hoy.replace(/\//g, "-")}.pdf`);
    this.mostrarToast("PDF descargado exitosamente.", "exito");
  }

  private enviarPresupuestoWhatsApp(): void {
    if (this.seleccionadosQuote.size === 0) return;

    // Fecha actual formateada
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    let totalUsd = 0;
    let lineas = `📋 *PRESUPUESTO DE REPARACIÓN*\n`;
    lineas += `📅 *Fecha:* ${fechaFormateada}\n`;
    lineas += `----------------------------------\n`;

    this.seleccionadosQuote.forEach((item) => {
      const bs = item.calcularPrecioBs(this.tasaActualCache);
      totalUsd += item.precioUsd;
      lineas += `• *${item.producto}*\n   💰 $${item.precioUsd.toFixed(2)} | Bs. ${bs.toFixed(2)}\n`;
    });

    const totalBs = totalUsd * this.tasaActualCache;

    lineas += `----------------------------------\n`;
    lineas += `🛠️ *TOTAL DE LA REPARACIÓN:*\n`;
    lineas += `💵 *TOTAL USD:* $${totalUsd.toFixed(2)}\n`;
    lineas += `🇻🇪 *TOTAL BS:* Bs. ${totalBs.toFixed(2)}\n`;
    lineas += `📊 *Tasa BCV del día:* Bs. ${this.tasaActualCache.toFixed(2)}\n\n`;
    lineas += `⚠️ *Nota:* Presupuesto sujeto a la tasa oficial del dólar del día en que se realice el pago (el monto en bolívares está sujeto a cambios diarios).\n\n`;
    lineas += `----------------------------------\n`;
    lineas += `💳 *Métodos de Pago Aceptados:*\n`;
    lineas += `   • Efectivo\n`;
    lineas += `   • Pago Móvil\n\n`;
    lineas += `🔧 *Garantía:* 30 días sobre la reparación realizada.\n\n`;
    lineas += `📍 *Ubicación:* Calle 33 con Carrera 23\n\n`;
    lineas += `_¡Gracias por preferirnos!_ 🛠️`;

    const mensajeEncoded = encodeURIComponent(lineas);
    const urlWhatsApp = `https://api.whatsapp.com/send?text=${mensajeEncoded}`;

    try {
      window.open(urlWhatsApp, "_blank");
      this.mostrarToast("Abriendo WhatsApp para enviar presupuesto...", "exito");
    } catch {
      navigator.clipboard.writeText(lineas);
      this.mostrarToast("Presupuesto copiado al portapapeles. ¡Puedes pegarlo en WhatsApp!", "info");
    }
  }

  public renderizarResumenTotales(datos: {
    totalUsd: number;
    totalBs: number;
    cantidad: number;
    promedioUsd: number;
    maxUsd: number;
    minUsd: number;
  }): void {
    const elUsd = document.getElementById("resumen-usd");
    const elBs = document.getElementById("resumen-bs");
    const elCant = document.getElementById("resumen-cant");
    const elPromedio = document.getElementById("resumen-promedio");
    const elMax = document.getElementById("resumen-max");
    const elMin = document.getElementById("resumen-min");

    if (elUsd) elUsd.textContent = `$${datos.totalUsd.toFixed(2)}`;
    if (elBs) elBs.textContent = `Bs. ${datos.totalBs.toFixed(2)}`;
    if (elCant) elCant.textContent = datos.cantidad.toString();
    if (elPromedio) elPromedio.textContent = `$${datos.promedioUsd.toFixed(2)}`;
    if (elMax) elMax.textContent = `$${datos.maxUsd.toFixed(2)}`;
    if (elMin) elMin.textContent = `$${datos.minUsd.toFixed(2)}`;
  }

  public mostrarSpinner(): void {
    if (this.loader) this.loader.classList.remove("hidden");
  }

  public ocultarSpinner(): void {
    if (this.loader) this.loader.classList.add("hidden");
  }

  public mostrarToast(mensaje: string, tipo: "exito" | "error" | "info" = "info"): void {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;

    let icono = "ℹ️";
    if (tipo === "exito") icono = "✅";
    if (tipo === "error") icono = "⚠️";

    toast.innerHTML = `<span class="toast-icono">${icono}</span> <span class="toast-texto">${this.escapeHtml(mensaje)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("mostrar");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("mostrar");
      toast.addEventListener("transitionend", () => toast.remove());
    }, 3500);
  }

  public onAgregarPrecio(callback: (datos: { producto: string; precioUsd: number }) => void): void {
    this.cbAgregarPrecio = callback;
  }

  public onEditarPrecio(callback: (id: string, datos: { producto: string; precioUsd: number }) => void): void {
    this.cbEditarPrecio = callback;
  }

  public onEliminarPrecio(callback: (id: string) => void): void {
    this.cbEliminarPrecio = callback;
  }

  public onActualizarTasaManual(callback: (nuevaTasa: number) => void): void {
    this.cbActualizarTasaManual = callback;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
