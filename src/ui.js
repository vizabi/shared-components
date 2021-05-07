import { observable, extendObservable } from "mobx";
import * as utils from "./legacy/base/utils";

export function ui(defaults = {}, config = {}, baseConfig = {}) {
  const _ui = {};
  const defaultKeys = Object.getOwnPropertyNames(defaults);
  const configKeys = Object.getOwnPropertyNames(config);
  const baseConfigKeys = Object.getOwnPropertyNames(baseConfig);

  for (let key of new Set([...defaultKeys, ...configKeys, ...baseConfigKeys])) {
    if (typeof defaults[key] !== "function" && (utils.isPlainObject(config[key]) || utils.isPlainObject(baseConfig[key]) || utils.isPlainObject(defaults[key]))) {
      if (!config[key]) extendObservable(config, {[key] : {}});
                
      _ui[key] = ui(defaults[key], config[key], baseConfig[key]);
    } else {
      const newObj = {};
      const descriptor = {
        get() {
          return (typeof config[key] !== "undefined") ? config[key] : 
            (typeof baseConfig[key] !== "undefined") ? baseConfig[key] : 
              typeof defaults[key] === "function" ? utils.deepClone(defaults[key]()) : defaults[key];
        },
        set(value) {
          if (typeof config[key] !== "undefined" && value == defaults[key]) {
            delete config[key];
          } else {
            config[key] = value;
          }
        },
        enumerable: true,
        configurable: true
      };
      Object.defineProperty(_ui, key, descriptor);
    }
  }
  return observable(_ui);
}

// export function ui2(defaults = {}, config, parentConfig = {}) {
//     const _ui = {};
//     const defaultKeys = Object.keys(defaults);
//     const configKeys = Object.keys(config);
//     const parentConfigKeys = Object.keys(config);

//     for (let key of new Set([...defaultKeys, ...configKeys, ...parentConfigKeys])) {
//         const descriptor = {
//             get() {
//                 if (utils.isPlainObject(config[key]) || utils.isPlainObject(config[key])) {
//                     return ui2(defaults[key], config[key] || (config[key] = {}), parentConfig[key]);
//                 }
//                 return (typeof config[key] !== "undefined") ? config[key] : 
//                     (typeof parentConfig[key] !== "undefined") ? parentConfig[key] : defaults[key];
//             },
//             set(value) { config[key] = value },
//             enumerable: true,
//             configurable: true
//         };
//         Object.defineProperty(_ui, key, descriptor);
//     }
//     return observable(_ui);
// }
