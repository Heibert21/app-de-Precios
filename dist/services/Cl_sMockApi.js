export default class Cl_sMockApi {
    /**
     * 🔗 Mapeo de URLs de MockAPI.
     * Coloca aquí el link de tu MockAPI para la tabla de precios.
     */
    static getUri(tabla) {
        const urls = {
            precios: "https://6a7f388e3183f5fd884af9cd.mockapi.io/precios"
        };
        return urls[tabla] || "";
    }
    static async fetchMockApi({ method = "GET", uri, body, headers = {}, }) {
        if (!uri || uri.trim() === "" || uri.includes("TU_MOCKAPI_URL_AQUI")) {
            return { ok: false, status: 0, message: "URL de MockAPI no configurada aún" };
        }
        try {
            const options = {
                method,
                headers: { "Content-Type": "application/json", ...headers },
            };
            if (body !== undefined) {
                options.body = JSON.stringify(body);
            }
            const respuesta = await fetch(uri, options);
            const status = respuesta.status;
            if (status === 404) {
                return { ok: true, status, data: [] };
            }
            if (!respuesta.ok) {
                return { ok: false, status, data: [] };
            }
            let data = null;
            try {
                data = await respuesta.json();
            }
            catch {
                data = null;
            }
            return { ok: true, status, data };
        }
        catch (error) {
            return { ok: false, status: 0, message: error?.message };
        }
    }
    static async getTabla({ tabla }) {
        const uri = this.getUri(tabla);
        if (!uri)
            return { ok: false, tabla: [] };
        const respuesta = await this.fetchMockApi({ method: "GET", uri });
        if (respuesta.status === 404 || !respuesta.ok) {
            return { ok: false, tabla: [] };
        }
        return { ok: true, tabla: respuesta.data ?? [] };
    }
    static async agregar(registro, tabla) {
        const uri = this.getUri(tabla);
        if (!uri)
            return { ok: false, mensaje: "MockAPI URL no configurada." };
        const respuesta = await this.fetchMockApi({
            method: "POST",
            uri,
            body: registro,
        });
        if (!respuesta.ok) {
            return { ok: false, mensaje: "Error al guardar el registro en MockAPI." };
        }
        return {
            ok: true,
            mensaje: "Registro guardado en MockAPI con ID: " + (respuesta.data?.id ?? ""),
            id: respuesta.data?.id
        };
    }
    static async modificar(id, registro, tabla) {
        const uriBase = this.getUri(tabla);
        if (!uriBase)
            return { ok: false, mensaje: "MockAPI URL no configurada." };
        const uri = `${uriBase}/${id}`;
        const respuesta = await this.fetchMockApi({
            method: "PUT",
            uri,
            body: registro,
        });
        if (!respuesta.ok) {
            return { ok: false, mensaje: "Error al actualizar en MockAPI." };
        }
        return { ok: true, mensaje: "Actualizado correctamente en MockAPI." };
    }
    static async eliminar(id, tabla) {
        const uriBase = this.getUri(tabla);
        if (!uriBase)
            return { ok: false, mensaje: "MockAPI URL no configurada." };
        const uri = `${uriBase}/${id}`;
        const respuesta = await this.fetchMockApi({ method: "DELETE", uri });
        if (!respuesta.ok) {
            return { ok: false, mensaje: "No se pudo eliminar de MockAPI." };
        }
        return { ok: true, mensaje: "Eliminado con éxito de MockAPI." };
    }
}
//# sourceMappingURL=Cl_sMockApi.js.map