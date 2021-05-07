import { BaseComponent } from "../base-component";

const CollectionMixin = superClass => class extends superClass {
  //static _collection = {};
  static add(name, addedClass) {
    this._collection[name] = addedClass;
  }
  static get(name) { return CollectionMixin._collection[name];}
};

CollectionMixin._collection = {};

export class Button extends CollectionMixin(BaseComponent) {
  constructor (config) {
    super(config);

    const {title, icon, func, required, statebind, statebindfunc, ignoreSize} = config;
    this.title = title;
    this.icon = icon;
    this.func = func;
    this.required = required;
    this.statebind = statebind;
    this.statebindfunc = statebindfunc;
    this.ignoreSize = ignoreSize;
  }
}

Button.BaseClass = Button;
