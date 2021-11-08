import {BaseComponent} from "../base-component.js";
import {decorate, computed} from "mobx";
import "./facet.scss";

function getFacetId(d){
  return d;
}
class _Facet extends BaseComponent {

  get MDL(){
    return {
      facet: this.model.encoding.facet
    };
  }


  loading(){
    //this.addReaction(this.addRemoveSubcomponents, true);
  }

  draw(){
      this.addReaction(this.addRemoveSubcomponents);
  }

  update(){
      console.log(this.model.dataMap);
  }

  getDataForSubcomponent(id){
    return [...this.data.get(id).values()];
  }

  get data() {
    return this.model.dataMap.groupBy(this.MDL.facet.row);
  }


  addRemoveSubcomponents(){
    const {facetedComponentCssClass} = this.options;

    const facetKeys = [...this.data.keys() ].sort(d3.ascending);
    const ncolumns = 1;
    const nrows = facetKeys.length;

    //The fr unit sets size of track as a fraction of the free space of grid container
    //We need as many 1fr as rows and columns to have cells equally sized (grid-template-columns: 1fr 1fr 1fr;)
    this.element
      .style("grid-template-rows", "1fr ".repeat(nrows))
      .style("grid-template-columns", "1fr ".repeat(ncolumns));

    let sections = this.element.selectAll(".vzb-facet-inner")
      .data(facetKeys, getFacetId);

    sections.exit()
      .each(d => this.removeSubcomponent(d))
      .remove();      

    sections.enter().append("div")
      .attr("class", d => "vzb-facet-inner")
      //add an intermediary div with null datum to prevent unwanted data inheritance to subcomponent
      //https://stackoverflow.com/questions/17846806/preventing-unwanted-data-inheritance-with-selection-select
      .each(function(d){
        d3.select(this).append("div")
          .datum(null)
          .attr("class", () => `${facetedComponentCssClass} vzb-${getFacetId(d)}`);
      })
      .each(d => this.addSubcomponent(d))
      .merge(sections)      
      .style("grid-row-start", (d) => facetKeys.indexOf(d) + 1)
      .style("grid-column-start", (_, i) => 0 + 1);

    this.services.layout._resizeHandler();
  }


  addSubcomponent(d){
    console.log("adding", d)
    const {facetedComponent} = this.options;
    const name = getFacetId(d);

    const subcomponent = new facetedComponent({
      placeholder: ".vzb-" + name,
      model: this.model,
      name,
      parent: this,
      root: this.root,
      state: {alias: this.state.alias},
      services: this.services,
      ui: this.ui,
      default_ui: this.DEFAULT_UI
    });
    this.children.push(subcomponent);
  }


  removeSubcomponent(d){
    console.log("removing", d)
    const subcomponent = this.findChild({name: getFacetId(d)});
    if(subcomponent) {
      subcomponent.deconstruct();
    }
  }
}

_Facet.DEFAULT_UI = {
};

export const Facet = decorate(_Facet, {
  "MDL": computed,
  "data": computed
});