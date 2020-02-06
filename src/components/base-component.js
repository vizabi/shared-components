import { autorun, decorate, observable, reaction, comparer, createAtom } from "mobx";
import { STATUS } from "../utils.js";
import { ui as _ui} from "../ui.js";
import { cpus } from "os";

class _BaseComponent {

  constructor({placeholder, model, services, subcomponents, template, id, parent, root, name, ui, state, options, default_ui = {}}){
    this.id = id || "c0";
    this.status = STATUS.INIT;
    this.template = this.template || template || "";
    this.subcomponents = this.subcomponents || subcomponents || [];
    this.services = this.services || services || {};
    this.model = this.model || model;
    this.state = state || {};
    this.parent = parent || null;
    this.children = [];
    this.root = root || this;
    this.name = name || "";
    this.options = options || {};

    this.reactions = new Map();

    //append the template to placeholder
    const scope = this.parent && this.parent.element ? this.parent.element : d3; //d3 would search global scope
    this.element = scope.select(placeholder).html(this.template);
    if(!this.element.node()) console.warn(`
      Vizabi component ${this.constructor.name} id: ${this.id} name: ${this.name} 
      can't find placeholder to render: 
      ${placeholder} 
      Please check that placeholder exists and is correctly specified in the component initialisation.
    `, this);

    this.DEFAULT_UI = Object.assign({}, this.constructor.DEFAULT_UI, default_ui);
    this.ui = this.setupUI(ui);

    this.subcomponents.forEach( (comp, index) => {
      const subcomponent = new comp.type({
        placeholder: comp.placeholder,
        model: comp.model || this.model,
        services: this.services,
        id: this.id + "-" + index,
        parent: this,
        root: this.root,
        ui: this.getUI(comp, ui),
        state: comp.state,
        name: comp.name,
        template: comp.template,
        options: comp.options,
        default_ui: this.DEFAULT_UI[comp.name]
      });
      this.children.push(subcomponent);
    });

    this.setup(this.options);
    autorun(this.render.bind(this));
    autorun(this.updateStatus.bind(this));
    autorun(this.resize.bind(this));
  }

  getUI(comp, ui) {
    const name = comp.name;
    if (name && !ui[name]) ui[name] = {};
    return name ? ui[name] : ui;
  }

  setupUI(ui) {
    return _ui(this.DEFAULT_UI, ui);
  }

  setup() {}

  addReaction(method, sideEffect, options = {}){
    if(!this.reactions.has(method)){
      this.reactions.set(method, sideEffect ? 
        reaction(method.bind(this), sideEffect.bind(this), options)
        : 
        autorun(() => {        
          if(this.status === STATUS.READY) method.bind(this)();
        }));
    }
  }
  removeReaction(method){
    if(this.reactions.has(method)){
      this.reactions.get(method)();
      this.reactions.delete(method);
    }
  }
  removeAllReactions(){
    this.reactions.forEach((_disposer, method) => this.removeReaction(method));
  }

  findChild({name, id, type}){
    if (this.name === name || this.id === id || this.constructor.name === type) return this;
    return this.children.find(c => c.findChild({name, id, type}));
  }

  updateStatus(){
    const dependencies = Object.values(this.services).map((m)=>m.status)
      .concat(this.children.map((m)=>m.status))
      .concat(this.model.state);

    if (dependencies.every(dep => dep === STATUS.READY || dep == undefined))
      this.status = STATUS.READY;
    else if (dependencies.some(dep => dep === STATUS.ERROR))
      this.status = STATUS.ERROR;
    else
      this.status = STATUS.PENDING;
  }

  render() {
    if(this.status === STATUS.READY) this.draw();
    if(this.status === STATUS.PENDING) this.loading();
    if(this.status === STATUS.ERROR) {
      this.removeAllReactions();
      this.error();
    }
  }

  draw() {}
  loading() {}
  error() {}
  resize() {}
}

_BaseComponent.DEFAULT_UI = {};

export const BaseComponent = decorate(_BaseComponent, {
  "status": observable,
  "state": observable
});
