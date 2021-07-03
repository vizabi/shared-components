import { autorun, decorate, observable, computed } from "mobx";
import { STATUS } from "../utils.js";
import { ui as _ui} from "../ui.js";
import * as utils from "../legacy/base/utils";

class _BaseComponent {

  constructor({placeholder, model, services, subcomponents, template, id, parent, root, name, ui, default_ui = {}, state, options }){
    this.id = id || "c0";
    //this.status = STATUS.INIT;
    this.template = template || "";
    this.subcomponents = subcomponents || [];
    this.services = services || {};
    this.model = model;
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

    this.DEFAULT_UI = utils.deepExtend(default_ui, utils.deepExtend(utils.deepExtend({}, this.constructor.DEFAULT_UI), default_ui));

    this.ui = this.setupUI(this.DEFAULT_UI, ui);

    this.subcomponents.forEach( (comp, index) => {
      if(!comp.type) {
        console.error(`
          Was unable to find a subcomponent "${comp.name}"
          while building a component tree in parent "${this.name}".
          This can be due to a misconfiguration, error in parent "subcomponents" definitions
          or that subcomponent in question isn't registered or available to code. Hard to tell...
        `, comp);
      } else {
        const subcomponent = new comp.type({
          placeholder: comp.placeholder,
          model: comp.model || this.model,
          services: this.services,
          id: this.id + "-" + index,
          parent: this,
          root: this.root,
          ui: this.getUI(comp, ui),
          default_ui: comp.default_ui || this.getUI(comp, default_ui),
          state: comp.state,
          name: comp.name,
          template: comp.template,
          options: comp.options,
        });
        this.children.push(subcomponent);
      }
    });

    this.setup(this.options);
    this.addReaction(this.draw);
    this.addReaction(this.loading, true);
    this.addReaction(this.resize);
  }

  getUI(comp, ui) {
    const name = comp.name;
    if (name && !ui[name]) ui[name] = {};
    return name ? ui[name] : ui;
  }

  setupUI(defaults, ui, baseUI) {
    return _ui(defaults, ui, baseUI);
  }

  addReaction(method, ignoreStatus){
    if(!method) return utils.warn("Basecomponent: addReaction() method not found", method);
    if(!this.reactions.has(method)){
      this.reactions.set(method, 
        autorun(() => {
          if(ignoreStatus || this.status === STATUS.READY) method.bind(this)();
        }, {
          name: method.name, 
          onError: (err) => {
            this.element.classed("vzb-loading-data", false);
            this.error(err);
          }
        })
      );
    }
  }
  removeReaction(method){
    if(this.reactions.has(method)){
      //kill mobx autoruns and reactions
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

  deconstruct(){
    // deconstruct and remove subcomponents
    if (this.children.length) {
      this.children.forEach(c => {
        c.deconstruct(); 
        c = void 0;
      });
    }
    this.removeAllReactions();
    // deconstruct and remove services
    if (this.root == this){
      Object.values(this.services).forEach(s => {
        s.deconstruct();
        s = void 0;
      });
    }
  }

  get status() {
    const dependencies = Object.values(this.services).map((m)=>m.status)
      .concat(this.children.map((m)=>m.status))
      .concat(this.model.state);

    if (dependencies.every(dep => dep === STATUS.READY || dep == undefined))
      return STATUS.READY;
    else if (dependencies.some(dep => dep === STATUS.ERROR))
      return STATUS.ERROR;
    else
      return STATUS.PENDING;
  }

  setup() {}
  draw() {}
  loading() {
    if (this.options.showLoading)
      this.element.classed("vzb-loading-data", this.status == STATUS.PENDING);
  }
  error() {}
  resize() {}
}

_BaseComponent.DEFAULT_UI = {};

export const BaseComponent = decorate(_BaseComponent, {
  //"status": observable,
  "status": computed,
  "state": observable
});
