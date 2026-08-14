import Cl_mPrecio from "./Cl_mPrecio.js";

export default class Cl_mAppPrecios {
  private _tasaCambio: number = 0;
  private _precios: Cl_mPrecio[] = [];

  constructor(tasaInicial: number = 0) {
    this._tasaCambio = tasaInicial;
  }

  public get tasaCambio(): number {
    return this._tasaCambio;
  }

  public set tasaCambio(val: number) {
    this._tasaCambio = val;
  }

  public get precios(): Cl_mPrecio[] {
    return this._precios;
  }

  public setPrecios(arrayPlanos: any[]): void {
    this._precios = arrayPlanos.map(item => new Cl_mPrecio(item));
  }

  public agregarPrecio(precioObj: Cl_mPrecio): void {
    this._precios.unshift(precioObj);
  }

  public editarPrecio(id: string, nuevoProducto: string, nuevoPrecioUsd: number): boolean {
    const item = this._precios.find(p => String(p.id) === String(id));
    if (item) {
      item.producto = nuevoProducto;
      item.precioUsd = nuevoPrecioUsd;
      return true;
    }
    return false;
  }

  public eliminarPrecio(id: string): boolean {
    const prevLength = this._precios.length;
    this._precios = this._precios.filter(p => String(p.id) !== String(id));
    return this._precios.length < prevLength;
  }

  public calcularTotalUsd(): number {
    return this._precios.reduce((acum, p) => acum + p.precioUsd, 0);
  }

  public calcularTotalBs(): number {
    return this.calcularTotalUsd() * this._tasaCambio;
  }

  public cantidadPrecios(): number {
    return this._precios.length;
  }

  public calcularPromedioUsd(): number {
    if (this._precios.length === 0) return 0;
    return this.calcularTotalUsd() / this._precios.length;
  }

  public obtenerPrecioMaximoUsd(): number {
    if (this._precios.length === 0) return 0;
    return Math.max(...this._precios.map(p => p.precioUsd));
  }

  public obtenerPrecioMinimoUsd(): number {
    if (this._precios.length === 0) return 0;
    return Math.min(...this._precios.map(p => p.precioUsd));
  }
}
