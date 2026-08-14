import Cl_mPrecio from "./Cl_mPrecio.js";
export default class Cl_mAppPrecios {
    _tasaCambio = 0;
    _precios = [];
    constructor(tasaInicial = 0) {
        this._tasaCambio = tasaInicial;
    }
    get tasaCambio() {
        return this._tasaCambio;
    }
    set tasaCambio(val) {
        this._tasaCambio = val;
    }
    get precios() {
        return this._precios;
    }
    setPrecios(arrayPlanos) {
        this._precios = arrayPlanos.map(item => new Cl_mPrecio(item));
    }
    agregarPrecio(precioObj) {
        this._precios.unshift(precioObj);
    }
    editarPrecio(id, nuevoProducto, nuevoPrecioUsd) {
        const item = this._precios.find(p => String(p.id) === String(id));
        if (item) {
            item.producto = nuevoProducto;
            item.precioUsd = nuevoPrecioUsd;
            return true;
        }
        return false;
    }
    eliminarPrecio(id) {
        const prevLength = this._precios.length;
        this._precios = this._precios.filter(p => String(p.id) !== String(id));
        return this._precios.length < prevLength;
    }
    calcularTotalUsd() {
        return this._precios.reduce((acum, p) => acum + p.precioUsd, 0);
    }
    calcularTotalBs() {
        return this.calcularTotalUsd() * this._tasaCambio;
    }
    cantidadPrecios() {
        return this._precios.length;
    }
    calcularPromedioUsd() {
        if (this._precios.length === 0)
            return 0;
        return this.calcularTotalUsd() / this._precios.length;
    }
    obtenerPrecioMaximoUsd() {
        if (this._precios.length === 0)
            return 0;
        return Math.max(...this._precios.map(p => p.precioUsd));
    }
    obtenerPrecioMinimoUsd() {
        if (this._precios.length === 0)
            return 0;
        return Math.min(...this._precios.map(p => p.precioUsd));
    }
}
//# sourceMappingURL=Cl_mAppPrecios.js.map