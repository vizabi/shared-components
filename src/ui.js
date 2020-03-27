import { observable } from "mobx";
import * as utils from "./legacy/base/utils";

export function ui(defaults = {}, config, parentConfig = {}) {
    const _ui = {};
    const defaultKeys = Object.keys(defaults);
    const configKeys = Object.keys(config);
    const parentConfigKeys = Object.keys(config);

    for (let key of new Set([...defaultKeys, ...configKeys, ...parentConfigKeys])) {
        const descriptor = {
            get() {
                if (utils.isPlainObject(config[key]) || utils.isPlainObject(config[key])) {
                    return ui(defaults[key], config[key] || (config[key] = {}), parentConfig[key]);
                }
                return (typeof config[key] !== "undefined") ? config[key] : 
                    (typeof parentConfig[key] !== "undefined") ? parentConfig[key] : defaults[key];
            },
            set(value) { config[key] = value },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(_ui, key, descriptor);
    }
    return observable(_ui);
}