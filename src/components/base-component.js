import { autorun, decorate, observable } from "mobx";

const STATE = {INIT: "init", PENDING: "pending", READY: "ready", ERROR: "error"};

class BaseComponent {

  constructor({placeholder, model, services, subcomponents, template}){
    this.state = STATE.INIT;
    this.template = this.template || template || "";
    this.subcomponents = this.subcomponents || subcomponents || [];
    this.services = this.services || services || {};
    this.model = this.model || model;

    const scope = this.parent && this.parent.view ? this.parent.view : d3; //d3 would search global scope
    this.view = scope.select(placeholder).html(this.template);
    this.viewRaw = this.view.node();
    this.children = [];
    this.parent = null;
    
    this.subcomponents.forEach( comp => {
      const subcomponent = new comp.type({
        placeholder: comp.placeholder, 
        model: comp.model || this.model, 
        services: this.services
      });
      subcomponent.parent = this;
      this.children.push(subcomponent);
    });
        
    this.setup();
    autorun(this.render.bind(this));
    autorun(this.updateState.bind(this));
  }

  setup() {}

  updateState(){
    const dependencies = Object.values(this.services).concat(this.children);
    if (dependencies.every(dep => dep.state == STATE.READY)) {
      this.state = STATE.READY;
    } else if (dependencies.find(dep => dep.state == STATE.ERROR)) {
      this.state = STATE.ERROR;
    } else {
      this.state = STATE.PENDING;
    }
  }

  render() {
    if(this.model) this.model.on("fulfilled", this.draw.bind(this));
    //this.model.on("pending", this.loading.bind(this));
    //this.model.on("rejected", this.error.bind(this));
  }

  draw() {}
  loading() {}
  error() {}
}

export default decorate(BaseComponent, {
  "state": observable
});