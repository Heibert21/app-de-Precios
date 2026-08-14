export default class Cl_mPrecio {
  private _id: string;
  private _producto: string;
  private _precioUsd: number;
  private _fechaRegistro: string;

  constructor({
    id,
    producto,
    precioUsd,
    fechaRegistro
  }: {
    id?: string;
    producto: string;
    precioUsd: number;
    fechaRegistro?: string;
  }) {
    this._id = id || Date.now().toString() + Math.random().toString(36).substr(2, 4);
    this._producto = producto;
    this._precioUsd = precioUsd;
    this._fechaRegistro = fechaRegistro || new Date().toISOString();
  }

  public get id(): string {
    return this._id;
  }

  public get producto(): string {
    return this._producto;
  }

  public set producto(val: string) {
    this._producto = val;
  }

  public get precioUsd(): number {
    return this._precioUsd;
  }

  public set precioUsd(val: number) {
    this._precioUsd = val;
  }

  public get fechaRegistro(): string {
    return this._fechaRegistro;
  }

  public calcularPrecioBs(tasaCambio: number): number {
    return this._precioUsd * tasaCambio;
  }

  public toJSON() {
    return {
      id: this._id,
      producto: this._producto,
      precioUsd: this._precioUsd,
      fechaRegistro: this._fechaRegistro
    };
  }
}
