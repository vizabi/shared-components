import { observable } from "mobx";

export function ui(defaults = {}, config) {
    const ui = {};
    Object.keys(defaults).forEach(key => {
        const descriptor = {
            get() { return config[key] || defaults[key]},
            set(value) { config[key] = value },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(ui, key, descriptor);
    })
    return observable(ui);
}