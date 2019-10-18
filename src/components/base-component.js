import { autorun, decorate, observable } from "mobx";
import { STATUS } from "../utils.js";
import { ui as _ui} from "../ui.js";


class BaseComponent {
  static DEFAULT_UI = {}

  constructor({placeholder, model, services, subcomponents, template, id, parent, root, name, ui, state}){
    this.id = id || "c0";
    this.status = STATUS.INIT;
    this.template = this.template || template || "";
    this.subcomponents = this.subcomponents || subcomponents || [];
    this.services = this.services || services || {};
    this.model = this.model || model;
    this.state = state || {};

    const scope = this.parent && this.parent.element ? this.parent.element : d3; //d3 would search global scope
    this.element = scope.select(placeholder).html(this.template);
    this.children = [];
    this.parent = parent || null;
    this.root = root || this;
    this.name = name || "";
    this.reactions = new Map();

    this.subcomponents.forEach( (comp, index) => {
      const subcomponent = new comp.type({
        placeholder: comp.placeholder,
        model: comp.model || this.model,
        services: this.services,
        id: this.id + "-" + index,
        parent: this,
        root: this.root,
        ui: comp.name ? (ui[comp.name] ? ui[comp.name] : (ui[comp.name] = {})) : ui,
        state: comp.state
      });
      this.children.push(subcomponent);
    });

    this.ui = this.setupUI(ui);
    this.setup();
    autorun(this.render.bind(this));
    autorun(this.updateStatus.bind(this));
    autorun(this.resize.bind(this));
  }

  setupUI(ui) {
    return _ui(this.constructor.DEFAULT_UI, ui);
  }

  setup() {}

  addReaction(method){
    if(!this.reactions.has(method)){
      this.reactions.set(method, autorun(method.bind(this)));
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

    if (dependencies.every(dep => dep === STATUS.READY))
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

export default decorate(BaseComponent, {
  "status": observable,
  "state": observable
});
