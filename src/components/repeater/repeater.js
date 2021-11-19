import {BaseComponent} from "../base-component.js";
import {decorate, computed} from "mobx";
import "./repeater.scss";

function firstLastOrMiddle(index, total){
  return {first: index === 0, last: index + 1 === total};
}

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
    const {repeatedComponentCssClass} = this.options;
    const {rowcolumn, ncolumns, nrows} = this.MDL.repeat;
    const repeat = this.MDL.repeat;

    //The fr unit sets size of track as a fraction of the free space of grid container
    //We need as many 1fr as rows and columns to have cells equally sized (grid-template-columns: 1fr 1fr 1fr;)
    this.element
      .style("grid-template-rows", "1fr ".repeat(nrows))
      .style("grid-template-columns", "1fr ".repeat(ncolumns));

    let sections = this.element.selectAll(".vzb-repeat-inner")
      .data(rowcolumn, d => repeat.getName(d));

    sections.exit()
      .each(d => this.removeSubcomponent(d))
      .remove();      

    sections.enter().append("div")
      .attr("class", "vzb-repeat-inner")
      //add an intermediary div with null datum to prevent unwanted data inheritance to subcomponent
      //https://stackoverflow.com/questions/17846806/preventing-unwanted-data-inheritance-with-selection-select
      .each(function(d){
        d3.select(this).append("div")
          .datum(null)
          .attr("class", () => `${repeatedComponentCssClass} vzb-${repeat.getName(d)}`);
      })
      .each(d => this.addSubcomponent(d))
      .merge(sections)      
      .style("grid-row-start", (_, i) => repeat.getRowIndex(i) + 1)
      .style("grid-column-start", (_, i) => repeat.getColumnIndex(i) + 1)
      .each((d,i) => {
        this.findChild({name: repeat.getName(d)}).state.positionInRepeat = this.getPosition(i)
      });

    this.services.layout._resizeHandler();
  }

  getPosition(i){
    const repeat = this.MDL.repeat;
    const {ncolumns, nrows} = repeat;

    return {
      row: firstLastOrMiddle(repeat.getRowIndex(i), nrows),
      column: firstLastOrMiddle(repeat.getColumnIndex(i), ncolumns)
    }
  }

  addSubcomponent(d){
    const {repeatedComponent} = this.options;
    const name = this.MDL.repeat.getName(d);

    const subcomponent = new repeatedComponent({
      placeholder: ".vzb-" + name,
      model: this.model,
      name,
      parent: this,
      root: this.root,
      state: {alias: d},
      services: this.services,
      options: this.options.repeatedComponentOptions,
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