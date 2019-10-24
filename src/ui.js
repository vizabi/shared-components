import { observable } from "mobx";

export function ui(defaults = {}, config) {
    const ui = {};
    const defaultKeys = Object.keys(defaults);
    const configKeys = Object.keys(config);

    for (let key of new Set([...defaultKeys, ...configKeys])) {
        const descriptor = {
            get() { return config[key] || defaults[key]},
            set(value) { config[key] = value },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(ui, key, descriptor);
    }
    return observable(ui);
}