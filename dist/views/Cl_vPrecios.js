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
    // Cotizador Rápido
    cotizacionBar;
    cotizacionCantNum;
    cotizacionTotalUsd;
    cotizacionTotalBs;
    btnEnviarWhatsapp;
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
        // Cotizador bar
        this.cotizacionBar = document.getElementById("cotizacion-bar");
        this.cotizacionCantNum = document.getElementById("cotizacion-cant-num");
        this.cotizacionTotalUsd = document.getElementById("cotizacion-total-usd");
        this.cotizacionTotalBs = document.getElementById("cotizacion-total-bs");
        this.btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");
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
        // Evento Cambio de Orden
        if (this.selectOrden) {
            this.selectOrden.addEventListener("change", () => {
                this.ordenActivo = this.selectOrden?.value || "recientes";
                this.refrescarListaPrecios();
            });
        }
        // Evento Exportar a PDF / Imprimir
        if (this.btnExportarPdf) {
            this.btnExportarPdf.addEventListener("click", () => {
                window.print();
            });
        }
        // Evento Enviar por WhatsApp
        if (this.btnEnviarWhatsapp) {
            this.btnEnviarWhatsapp.addEventListener("click", () => {
                this.enviarPresupuestoWhatsApp();
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
    enviarPresupuestoWhatsApp() {
        if (this.seleccionadosQuote.size === 0)
            return;
        let totalUsd = 0;
        let lineas = `📋 *PRESUPUESTO DE REPARACIÓN*\n----------------------------------\n`;
        this.seleccionadosQuote.forEach((item) => {
            const bs = item.calcularPrecioBs(this.tasaActualCache);
            totalUsd += item.precioUsd;
            lineas += `• *${item.producto}*\n   💰 $${item.precioUsd.toFixed(2)} | Bs. ${bs.toFixed(2)}\n`;
        });
        const totalBs = totalUsd * this.tasaActualCache;
        lineas += `----------------------------------\n`;
        lineas += `💵 *TOTAL USD:* $${totalUsd.toFixed(2)}\n`;
        lineas += `🇻🇪 *TOTAL BS:* Bs. ${totalBs.toFixed(2)}\n`;
        lineas += `📊 *Tasa BCV del día:* Bs. ${this.tasaActualCache.toFixed(2)}\n\n`;
        lineas += `_¡Gracias por su preferencia!_ 🛠️`;
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