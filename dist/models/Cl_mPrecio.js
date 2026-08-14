export default class Cl_mPrecio {
    _id;
    _producto;
    _precioUsd;
    _fechaRegistro;
    constructor({ id, producto, precioUsd, fechaRegistro }) {
        this._id = id || Date.now().toString() + Math.random().toString(36).substr(2, 4);
        this._producto = producto;
        this._precioUsd = precioUsd;
        this._fechaRegistro = fechaRegistro || new Date().toISOString();
    }
    get id() {
        return this._id;
    }
    get producto() {
        return this._producto;
    }
    set producto(val) {
        this._producto = val;
    }
    get precioUsd() {
        return this._precioUsd;
    }
    set precioUsd(val) {
        this._precioUsd = val;
    }
    get fechaRegistro() {
        return this._fechaRegistro;
    }
    calcularPrecioBs(tasaCambio) {
        return this._precioUsd * tasaCambio;
    }
    toJSON() {
        return {
            id: this._id,
            producto: this._producto,
            precioUsd: this._precioUsd,
            fechaRegistro: this._fechaRegistro
        };
    }
}
//# sourceMappingURL=Cl_mPrecio.js.map