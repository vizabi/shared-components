import { autorun, decorate, observable } from "mobx";
import { STATUS } from "../utils.js";


class BaseComponent {

  constructor({placeholder, model, services, subcomponents, template, id, parent, root, name}){
    this.id = id || "c0";
    this.status = STATUS.INIT;
    this.template = this.template || template || "";
    this.subcomponents = this.subcomponents || subcomponents || [];
    this.services = this.services || services || {};
    this.model = this.model || model;
    this.state = {};

    const scope = this.parent && this.parent.element ? this.parent.element : d3; //d3 would search global scope
    this.element = scope.select(placeholder).html(this.template);
    this.children = [];
    this.parent = parent || null;
    this.root = root || this;
    this.name = name || "";
    this.reactions = {};

    this.subcomponents.forEach( (comp, index) => {
      const subcomponent = new comp.type({
        placeholder: comp.placeholder,
        model: comp.model || this.model,
        services: this.services,
        id: this.id + "-" + index,
        parent: this,
        root: this.root
      });
      this.children.push(subcomponent);
    });

    this.setup();
    autorun(this.render.bind(this));
    autorun(this.updateStatus.bind(this));
    autorun(this.resize.bind(this));
  }

  setup() {}

  addReaction(methodName){
    if(this[methodName] && !this.reactions[methodName]){
      this.reactions[methodName] = autorun(this[methodName].bind(this));
    }
  }
  removeReaction(methodName){
    if(this[methodName] && this.reactions[methodName]){
      this.reactions[methodName]();
      delete this.reactions[methodName];
    }
  }
  removeAllReactions(){
    Object.keys(this.reactions).forEach(this.removeReaction);
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
