import { autorun, decorate, observable } from "mobx";
import { STATUS } from "../utils.js";


class BaseComponent {

  constructor({placeholder, model, services, subcomponents, template, id}){
    this.id = id || "c0";
    this.status = STATUS.INIT;
    this.template = this.template || template || "";
    this.subcomponents = this.subcomponents || subcomponents || [];
    this.services = this.services || services || {};
    this.model = this.model || model;
    this.state = {};

    const scope = this.parent && this.parent.view ? this.parent.view : d3; //d3 would search global scope
    this.view = scope.select(placeholder).html(this.template);
    this.viewRaw = this.view.node();
    this.children = [];
    this.parent = null;

    this.subcomponents.forEach( (comp, index) => {
      const subcomponent = new comp.type({
        placeholder: comp.placeholder,
        model: comp.model || this.model,
        services: this.services,
        id: this.id + "-" + index
      });
      subcomponent.parent = this;
      this.children.push(subcomponent);
    });

    this.setup();
    autorun(this.render.bind(this));
    autorun(this.updateStatus.bind(this));
    autorun(this.resize.bind(this));
  }

  setup() {}

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
    if(this.status === STATUS.READY) this.draw(this.model.dataArray);
    if(this.status === STATUS.PENDING) this.loading();
    if(this.status === STATUS.ERROR) this.error();
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
