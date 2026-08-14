import Cl_mPrecio from "../models/Cl_mPrecio.js";
export default class Cl_vPrecios {
    loader;
    tasaValorEl;
    constBtnEditTasa;
    formPrecio;
    tituloForm;
    inProducto;
    inPrecioUsd;
    btnSubmit;
    btnCancelarEdicion;
    listaPreciosEl;
    contadorItems;
    emptyState;
    toastContainer;
    // Nuevos controles de UI
    inputBuscar;
    selectOrden;
    btnExportarPdf;
    inputPrecioMin;
    inputPrecioMax;
    precioMinFiltro = null;
    precioMaxFiltro = null;
    // Cotizador Rápido
    cotizacionBar;
    cotizacionCantNum;
    cotizacionTotalUsd;
    cotizacionTotalBs;
    btnEnviarWhatsapp;
    btnLimpiarSeleccion;
    seleccionadosQuote = new Map();
    // Estado interno de vista
    editandoId = null;
    textoBusqueda = "";
    ordenActivo = "recientes";
    preciosCache = [];
    tasaActualCache = 0;
    // Callbacks de Eventos
    cbAgregarPrecio;
    cbEditarPrecio;
    cbEliminarPrecio;
    cbActualizarTasaManual;
    constructor() {
        this.loader = document.getElementById("loader");
        this.tasaValorEl = document.getElementById("tasa-valor");
        this.constBtnEditTasa = document.getElementById("btn-edit-tasa");
        this.formPrecio = document.getElementById("form-precio");
        this.tituloForm = document.getElementById("titulo-form") || this.formPrecio.previousElementSibling;
        this.inProducto = document.getElementById("producto");
        this.inPrecioUsd = document.getElementById("precio-usd");
        this.btnSubmit = this.formPrecio.querySelector('button[type="submit"]');
        // Crear o referenciar botón de cancelar edición
        let btnCancel = document.getElementById("btn-cancelar-edicion");
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
        this.listaPreciosEl = document.getElementById("lista-precios");
        this.contadorItems = document.getElementById("contador-items");
        this.emptyState = document.getElementById("empty-state");
        // Referencias a los nuevos controles
        this.inputBuscar = document.getElementById("buscar-input");
        this.selectOrden = document.getElementById("select-orden");
        this.btnExportarPdf = document.getElementById("btn-exportar-pdf");
        this.inputPrecioMin = document.getElementById("buscar-precio-min");
        this.inputPrecioMax = document.getElementById("buscar-precio-max");
        // Cotizador bar
        this.cotizacionBar = document.getElementById("cotizacion-bar");
        this.cotizacionCantNum = document.getElementById("cotizacion-cant-num");
        this.cotizacionTotalUsd = document.getElementById("cotizacion-total-usd");
        this.cotizacionTotalBs = document.getElementById("cotizacion-total-bs");
        this.btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");
        this.btnLimpiarSeleccion = document.getElementById("btn-limpiar-seleccion");
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
    bindEvents() {
        // Evento Formulario Submit
        this.formPrecio.addEventListener("submit", (e) => {
            e.preventDefault();
            const datos = this.obtenerDatosFormulario();
            if (!datos)
                return;
            if (this.editandoId && this.cbEditarPrecio) {
                this.cbEditarPrecio(this.editandoId, datos);
            }
            else if (this.cbAgregarPrecio) {
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
                    }
                    else {
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
        // Eventos Filtro Rango de Precios
        if (this.inputPrecioMin) {
            this.inputPrecioMin.addEventListener("input", () => {
                const val = parseFloat(this.inputPrecioMin?.value || "");
                this.precioMinFiltro = isNaN(val) ? null : val;
                this.refrescarListaPrecios();
            });
        }
        if (this.inputPrecioMax) {
            this.inputPrecioMax.addEventListener("input", () => {
                const val = parseFloat(this.inputPrecioMax?.value || "");
                this.precioMaxFiltro = isNaN(val) ? null : val;
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
            const target = e.target;
            // Click Editar
            const btnEdit = target.closest(".btn-editar");
            if (btnEdit && btnEdit.dataset.id) {
                const id = btnEdit.dataset.id;
                const nombre = btnEdit.dataset.nombre || "";
                const precioUsd = parseFloat(btnEdit.dataset.precio || "0");
                this.cargarFormularioEdicion(new Cl_mPrecio({ id, producto: nombre, precioUsd }));
                return;
            }
            // Click Eliminar
            const btnDel = target.closest(".btn-eliminar");
            if (btnDel && btnDel.dataset.id && this.cbEliminarPrecio) {
                this.cbEliminarPrecio(btnDel.dataset.id);
                return;
            }
        });
        // Delegar evento change para checkboxes del cotizador
        this.listaPreciosEl.addEventListener("change", (e) => {
            const target = e.target;
            if (target && target.classList.contains("checkbox-item")) {
                const id = target.dataset.id;
                if (!id)
                    return;
                if (target.checked) {
                    const item = this.preciosCache.find(p => String(p.id) === String(id));
                    if (item)
                        this.seleccionadosQuote.set(id, item);
                }
                else {
                    this.seleccionadosQuote.delete(id);
                }
                this.actualizarBarraCotizacion();
            }
        });
    }
    obtenerDatosFormulario() {
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
    cargarFormularioEdicion(precio) {
        this.editandoId = precio.id;
        this.inProducto.value = precio.producto;
        this.inPrecioUsd.value = precio.precioUsd.toString();
        if (this.tituloForm)
            this.tituloForm.textContent = "✏️ Editar Precio de Reparación";
        this.btnSubmit.textContent = "💾 Actualizar Cambios";
        this.btnCancelarEdicion.classList.remove("oculto");
        this.inProducto.focus();
        window.scrollTo({ top: this.formPrecio.offsetTop - 120, behavior: "smooth" });
    }
    cancelarModoEdicion() {
        this.editandoId = null;
        this.limpiarFormulario();
        if (this.tituloForm)
            this.tituloForm.textContent = "📝 Registrar Precio de Reparación";
        this.btnSubmit.textContent = "💾 Guardar Precio";
        this.btnCancelarEdicion.classList.add("oculto");
    }
    limpiarFormulario() {
        this.formPrecio.reset();
    }
    renderizarTasaBCV(tasa) {
        this.tasaActualCache = tasa;
        this.tasaValorEl.textContent = `Bs. ${tasa.toFixed(2)}`;
    }
    renderizarListaPrecios(precios, tasaCambio) {
        this.preciosCache = precios;
        this.tasaActualCache = tasaCambio;
        this.refrescarListaPrecios();
    }
    refrescarListaPrecios() {
        let filtrados = [...this.preciosCache];
        // 1. Filtrar por texto de búsqueda
        if (this.textoBusqueda) {
            filtrados = filtrados.filter((p) => p.producto.toLowerCase().includes(this.textoBusqueda));
        }
        // 1.1. Filtrar por rango de precios (USD)
        if (this.precioMinFiltro !== null) {
            filtrados = filtrados.filter((p) => p.precioUsd >= this.precioMinFiltro);
        }
        if (this.precioMaxFiltro !== null) {
            filtrados = filtrados.filter((p) => p.precioUsd <= this.precioMaxFiltro);
        }
        // 2. Aplicar Ordenamiento
        if (this.ordenActivo === "precio-asc") {
            filtrados.sort((a, b) => a.precioUsd - b.precioUsd);
        }
        else if (this.ordenActivo === "precio-desc") {
            filtrados.sort((a, b) => b.precioUsd - a.precioUsd);
        }
        else if (this.ordenActivo === "nombre-asc") {
            filtrados.sort((a, b) => a.producto.localeCompare(b.producto));
        }
        else if (this.ordenActivo === "nombre-desc") {
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
    limpiarSeleccion() {
        this.seleccionadosQuote.clear();
        // Desmarcar todos los checkboxes visibles
        const checkboxes = this.listaPreciosEl.querySelectorAll(".checkbox-item");
        checkboxes.forEach(cb => { cb.checked = false; });
        this.actualizarBarraCotizacion();
        this.mostrarToast("Selección limpiada.", "info");
    }
    actualizarBarraCotizacion() {
        if (!this.cotizacionBar)
            return;
        const totalItems = this.seleccionadosQuote.size;
        if (totalItems === 0) {
            this.cotizacionBar.classList.add("oculto");
            return;
        }
        this.cotizacionBar.classList.remove("oculto");
        if (this.cotizacionCantNum)
            this.cotizacionCantNum.textContent = totalItems.toString();
        let totalUsd = 0;
        this.seleccionadosQuote.forEach((item) => {
            totalUsd += item.precioUsd;
        });
        const totalBs = totalUsd * this.tasaActualCache;
        if (this.cotizacionTotalUsd)
            this.cotizacionTotalUsd.textContent = `$${totalUsd.toFixed(2)}`;
        if (this.cotizacionTotalBs)
            this.cotizacionTotalBs.textContent = `Bs. ${totalBs.toFixed(2)}`;
    }
    descargarPDF() {
        if (this.preciosCache.length === 0) {
            this.mostrarToast("No hay precios en el cat\u00e1logo para exportar.", "error");
            return;
        }
        const { jsPDF } = window.jspdf;
        const W = 90;
        const mg = 6;
        const cw = W - mg * 2;
        const rowH = 17;
        const headerH = 42;
        const footerH = 34;
        const H = headerH + (this.preciosCache.length * rowH) + 6 + footerH;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });
        const hoy = new Date().toLocaleDateString("es-VE", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
        const navy = [15, 23, 42];
        const azul = [2, 132, 199];
        const azulClr = [56, 189, 248];
        const verde = [16, 185, 129];
        const verdeClr = [167, 243, 208];
        const gris = [100, 116, 139];
        const grisClr = [226, 232, 240];
        const grisBg = [248, 250, 252];
        const blanco = [255, 255, 255];
        const dorado = [251, 191, 36];
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
        // Dibujar el logo usando base64 para evitar restricciones CORS
        try {
            const imgData = "data:image/jpeg;base64,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/Q+0CQPoZOjmgGMcwvhgmisZ9T87lSyxBwRlXNTfyubGaF2Sowk5coDyo3tpq/SP9yJ2IB1Aj1wYTLbId7HJG2S/S+kJBvu2IKTQII0QCSMSKKd+xyYOyNw3wX63qt56prZ7LZenxlaxtl6LZei/Q9F+h6Leeq/Y9V+p6oNB2dw7obx2ABIBGAxGFFSQFXO7r9r6QqgwANTkqzGDLbI63fAtR/eZ6gHBwtgosCBAwBpABMbJ6NUCFHGsGPZOT0KfivSZjkmk9KLFThE6LF2MFi7GCO3OArc6JzZ9Ftvwt9+Fvvwt9+Fvvwp1cj9KxdjBYuxgmcLlnPqUSjJNJ6X4r0gAuM8PSNPgMc9E/wBg+TkmNkdjwbOHxCPIRiAhmP8AfCCgSILL9ov2i/aIfB4F51AG8SH0RUg5fSkI7PYGMkYmPFo0eoP1ALgMScGo+IxK9Yfx8HKIhmJ8ZIDq8w9KLg1D/RPRROWNftV+0X7RGIQkmp/8UfBNAE6H5vcyjQFmjPSSAD3kACQMkkG2xKWP/g3/AP/aAAwDAQACAAMAAAAQ88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888833PHiAAsc43/3d888888888888888888888888gRtfus/7SIFzfzdPNLfPdbvmQhiUB48888888888888888wrMYUPbkc87gnp9x0OY9Mbc3f25o3o8888888888888888caPJ0IcEJgkY3Tz1/AU55EV96qp/r4888888888888888YKbAudIZAisRk4P+3HRsTj14EAUb4jaU88888888888884XxDTwtPndMBr7EBhwlcK4wEcqBb6jHhv8888888888888sc9PGxgpYLrmOGkFu6Z5U0sVCtvKdSjZ+c8888888888889u1hwjbk+9edM8J78Ak7axhCBVgEq03ZS3888888888888dQTmvtv4099999948caBBBBBBLjCcKCzwk8888888888888rDM5XVxuU/wB89t7HLKjggjzyT5ccTg5x3PPPPPPPPPPPPPDUmwAtv2VsIVa3LMMQFPq5y7/XkUYcqhPPPPPPPPPPPPPPPF7GgEdviVfPLDHb73z/ADzz177qsN1Rfzzzzzzzzzzzzzzzyyxio4HT3zXzzzzzzzzzznR32zEESRzzzzzzzzzzzzzzzzzw8zMj7j4xLzzzzzzzzzzmf6DGG+yfzzzzzzzzzzzzzzzzzzvSywbzy13jzzzzzzzzo/6xcNfxDvzzzzzzzzzzzzzzzzzg8dxEAMz5mxfzzzzzz1wz7JuOuDJJHzzzzzzzzzzzzzzzzLXMnQzfbLv7nzzzzzlb338ZJEyDOSrzzzzzzzzzzzzzzzymVJwy1OsHR2zDzzzyVy3gUsBXQQJH3zzzzzzzzzzzzzzzzxgqgiDnT7D337XzziT3k7shDAz0Zzzzzzzzzzzzzzzzzzzz0djaxosen76TzzzxxMZYCAIgjg13zzzzzzzzzzzzzzzzzzy5DTIwmdW+xf3zyhz4o/hWh4ABpzzzzzzzzzzzzzzzzzzzzWiUfydkib7lPzxVf3TWcDidEjXzzzzzzzzzzzzzzzzzzzzzzpXhg10tTwv33h6B+UqhZtaHzzzzzzzzzzzzzzzzzzzzzzjTzfxsunFX+p9X59X+QRFkjzzzzzzzzzzzzzzzzzzzzzzzw/T+ugsPkLzHr54zzkyuLhfzzzzzzzzzzzzzzzzzzzzzzzywzbBzcBb5EyuEQTozR7LjzzzzzzzzzzzzzzzzzzzzzzzzzykGjswUa8uUMTpe/AR41Tzzzzzzzzzzzzzzzzzzzzzzzzzzz/8A5gQYuc7nluivshH38888888888888888888888888888s8iTw2CTmOuuGmvr4888888888888888888888888888888djXAM8x2ynwgWDT3888888888888888888888888888888888888wCuw88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888//xAAqEQEAAgIBAgUEAwEBAQAAAAABABEhMRBBYSBAUXHwMLHB0ZGh4YGQ8f/aAAgBAwEBPxD/AMCguVKluCExMTHCpUqJXmqlSualEOQuawQJXFTsxKlcVK4tlvFEo8mFR3KlSuDxV8LpEgyyWSk7sW+NcEOXLiG458kMxTLPfj/vFcXXIzExMTEW+Lm5qXNyu8rvL6Epigz5EURywZZL4vha1DgeAnWUSiKdOKlSp7+HEWGGDHkAuOvBYCtRZgOmptleoFIcXLl8mo+IgUtgxAm/b/IOtHpiCWp8BqJX17qLgj6T1u+yMA6N/O8CY1xBNkqVK+kAtiK5RhkNmv1L3ca9v8h6R4VYl39dOsMZhwgKjtOuD8Sku+sW5xuU7k7k70bZajtKIFsQLJuU7kW4Z3PtO5AaXDOyIurp2YdUysn3glqYRjkuB1+uNRzCPpMqVZGU9YPfrEoJsvHW2JcCpWjx6xFFMVhZ0/hjuNQxjgir5PIqNWYAshCmJVU7M7M7M7M7UJkIRhzydqdmdtnZnZg7VQyIAthjE9EdQfIkIy7FXHo1f3KkEVCFWCPV/U7r+p3X9SlynvMSuamIoya9P/s7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";
            doc.addImage(imgData, "JPEG", 9, 7, 14, 14);
        }
        catch (e) {
            console.warn("No se pudo dibujar el logo base64 en el PDF:", e);
            // Circulo logo "TR" alternativo
            doc.setFillColor(...azulClr);
            doc.circle(16, 14, 7, "F");
            doc.setTextColor(...navy);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("TR", 16, 16.5, { align: "center" });
        }
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
    enviarPresupuestoWhatsApp() {
        if (this.seleccionadosQuote.size === 0)
            return;
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
        }
        catch {
            navigator.clipboard.writeText(lineas);
            this.mostrarToast("Presupuesto copiado al portapapeles. ¡Puedes pegarlo en WhatsApp!", "info");
        }
    }
    renderizarResumenTotales(datos) {
        const elUsd = document.getElementById("resumen-usd");
        const elBs = document.getElementById("resumen-bs");
        const elCant = document.getElementById("resumen-cant");
        const elPromedio = document.getElementById("resumen-promedio");
        const elMax = document.getElementById("resumen-max");
        const elMin = document.getElementById("resumen-min");
        if (elUsd)
            elUsd.textContent = `$${datos.totalUsd.toFixed(2)}`;
        if (elBs)
            elBs.textContent = `Bs. ${datos.totalBs.toFixed(2)}`;
        if (elCant)
            elCant.textContent = datos.cantidad.toString();
        if (elPromedio)
            elPromedio.textContent = `$${datos.promedioUsd.toFixed(2)}`;
        if (elMax)
            elMax.textContent = `$${datos.maxUsd.toFixed(2)}`;
        if (elMin)
            elMin.textContent = `$${datos.minUsd.toFixed(2)}`;
    }
    mostrarSpinner() {
        if (this.loader)
            this.loader.classList.remove("hidden");
    }
    ocultarSpinner() {
        if (this.loader)
            this.loader.classList.add("hidden");
    }
    mostrarToast(mensaje, tipo = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${tipo}`;
        let icono = "ℹ️";
        if (tipo === "exito")
            icono = "✅";
        if (tipo === "error")
            icono = "⚠️";
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
    onAgregarPrecio(callback) {
        this.cbAgregarPrecio = callback;
    }
    onEditarPrecio(callback) {
        this.cbEditarPrecio = callback;
    }
    onEliminarPrecio(callback) {
        this.cbEliminarPrecio = callback;
    }
    onActualizarTasaManual(callback) {
        this.cbActualizarTasaManual = callback;
    }
    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
//# sourceMappingURL=Cl_vPrecios.js.map