import { autorun } from "mobx";

export default class BaseComponent {

  constructor({placeholder, model, services, subcomponents, template}){
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
  }

  setup() {}
  render() {
    if(this.model) this.model.on("fulfilled", this.draw.bind(this));
    //this.model.on("pending", this.loading.bind(this));
    //this.model.on("rejected", this.error.bind(this));
  }

  draw() {}
  loading() {}
  error() {}
}
