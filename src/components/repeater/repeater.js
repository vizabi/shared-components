import {BaseComponent} from "../base-component.js";
import {decorate, computed} from "mobx";
import "./repeater.scss";

class _Repeater extends BaseComponent {

  get MDL(){
    return {
      repeat: this.model.encoding.repeat
    };
  }


  loading(){
    this.addReaction(this.addRemoveSubcomponents, true);
  }


  addRemoveSubcomponents(){
    const {componentCssName} = this.options;
    const {rowcolumn, ncolumns, nrows} = this.MDL.repeat;
    const repeat = this.MDL.repeat;

    //The fr unit sets size of track as a fraction of the free space of grid container
    //We need as many 1fr as rows and columns to have cells equally sized (grid-template-columns: 1fr 1fr 1fr;)
    this.element
      .style("grid-template-rows", "1fr ".repeat(nrows))
      .style("grid-template-columns", "1fr ".repeat(ncolumns));

    let sections = this.element.selectAll("div." + componentCssName)
      .data(rowcolumn, d => repeat.getName(d));

    sections.exit()
      .each(d => this.removeSubcomponent(d))
      .remove();      

    sections.enter().append("div")
      .attr("class", d => `${componentCssName} vzb-${repeat.getName(d)}`)
      .each(d => this.addSubcomponent(d))
      .merge(sections)      
      .style("grid-row-start", (_, i) => repeat.getRowIndex(i) + 1)
      .style("grid-column-start", (_, i) => repeat.getColumnIndex(i) + 1);

    this.services.layout._resizeHandler();
  }


  addSubcomponent(d){
    const {ComponentClass} = this.options;
    const name = this.MDL.repeat.getName(d);

    const subcomponent = new ComponentClass({
      placeholder: ".vzb-" + name,
      model: this.model,
      name,
      parent: this,
      root: this.root,
      state: {alias: d},
      services: this.services,
      ui: this.ui,
      default_ui: this.DEFAULT_UI
    });
    this.children.push(subcomponent);
  }


  removeSubcomponent(d){
    const subcomponent = this.findChild({name: this.MDL.repeat.getName(d)});
    if(subcomponent) {
      subcomponent.deconstruct();
    }
  }
}

_Repeater.DEFAULT_UI = {
};

export const Repeater = decorate(_Repeater, {
  "MDL": computed
});