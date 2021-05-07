import { BaseComponent } from "../base-component";

const CollectionMixin = superClass => class extends superClass {
  //static _collection = {};
  static add(name, addedClass) {
    CollectionMixin._collection[name] = addedClass;
  }
  static get(name) { return CollectionMixin._collection[name];}
};

CollectionMixin._collection = {};

export class Chart extends CollectionMixin(BaseComponent) {}
