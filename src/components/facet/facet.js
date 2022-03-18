import { BaseComponent } from "../base-component.js";
import { decorate, computed } from "mobx";
import "./facet.scss";

function getFacetId(d) {
  return d;
}

function firstLastOrMiddle(index, total) {
  return { first: index === 0, last: index + 1 === total };
}
class _Facet extends BaseComponent {

  get MDL() {
    return {
      facet_row: this.model.encoding.facet_row,
      facet_column: this.model.encoding.facet_column,
      maxheight: this.model.encoding.maxheight
    };
  }


  loading() {
    //this.addReaction(this.addRemoveSubcomponents, true);
  }

  draw() {

    if (this.updateLayoutProfile()) return; //return if exists with error
    this.addReaction(this.addRemoveSubcomponents);
    this.addReaction(this.updatePositionInRepeat);
  }

  updatePositionInRepeat() {
    this.children.forEach(child => child.state.positionInRepeat = this.state.positionInRepeat);
  }

  getDataForSubcomponent(id) {
    return [...this.data.get(id).values()];
  }

  get data() {
    return this.model.dataMap.order("facet_row").groupByWithMultiGroupMembership("facet_row");
  }

  get maxValues() {
    const result = {};
    [...this.data.keys()].forEach(key => {
      const sum = d3.sum([...this.data.get(key).values()].map(m=>m.maxheight));
      const limit = this.MDL.maxheight.config.limit;
      result[key] = (sum > limit ? limit : sum);
    })
    return result;
  }

  get scaleDomainRange() {
    return {
      domain: d3.sum(Object.values(this.maxValues)),
      range: this.height - 30 - 35
    }
  }

  updateLayoutProfile() {
    this.services.layout.size; //watch

    //this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR, this.state.positionInFacet);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;

    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  _setProportions() {
    const sumtotal = d3.sum(Object.values(this.maxValues)) || Object.values(this.maxValues).length;
    const proportions = {};
    Object.keys(this.maxValues).forEach(m => proportions[m] = (this.maxValues[m] || 1) / sumtotal);

    const templateString = [...this.data.keys()].map(m => proportions[m] + "fr").join(" ");
    console.log(templateString);
    //The fr unit sets size of track as a fraction of the free space of grid container
    //We need as many 1fr as rows and columns to have cells equally sized (grid-template-columns: 1fr 1fr 1fr;)
    this.element
      .style("grid-template-rows", "30px " + templateString + " 35px")
      .style("grid-template-columns", "1fr ".repeat(1));
  }

  addRemoveSubcomponents() {
    const { facetedComponentCssClass } = this.options;

    const facetKeys = [...this.data.keys()];
    const ncolumns = 1;
    const nrows = facetKeys.length;

    this._setProportions();

    let sections = this.element.selectAll(".vzb-facet-inner")
      .data(facetKeys, getFacetId);

    sections.exit()
      .each(d => this.removeSubcomponent(d))
      .remove();

    sections.enter().append("div")
      .attr("class", d => "vzb-facet-inner")
      //add an intermediary div with null datum to prevent unwanted data inheritance to subcomponent
      //https://stackoverflow.com/questions/17846806/preventing-unwanted-data-inheritance-with-selection-select
      .each(function (d) {
        d3.select(this).append("div")
          .datum(null)
          .attr("class", () => `${facetedComponentCssClass} vzb-${getFacetId(d)}`);
      })
      .each(d => this.addSubcomponent(d))
      .merge(sections)
      .style("grid-row-start", (d) => this.getPosition(facetKeys.indexOf(d)).row.start)
      .style("grid-row-end", (d) => this.getPosition(facetKeys.indexOf(d)).row.end)
      .style("grid-column-start", (_, i) => 0 + 1)

      .classed("vzb-facet-row-first", d => this.getPosition(facetKeys.indexOf(d)).row.first)
      .classed("vzb-facet-row-last", d => this.getPosition(facetKeys.indexOf(d)).row.last)
      .classed("vzb-facet-column-first", d => this.getPosition(facetKeys.indexOf(d)).column.first)
      .classed("vzb-facet-column-last", d => this.getPosition(facetKeys.indexOf(d)).column.last)

      .each((d, i) => {
        this.findChild({ name: getFacetId(d) }).state.positionInFacet = this.getPosition(facetKeys.indexOf(d))
      });

    this.services.layout._resizeHandler();
  }

  getPosition(i) {
    const nrows = [...this.data.keys()].length;
    const ncolumns = 1;
    const result = {
      row: firstLastOrMiddle(i, nrows),
      column: firstLastOrMiddle(0, ncolumns)
    }

    result.row.start = (result.row.first ? 0 : (i + 1)) + 1; //+1 is correction for 1-based numbers in css vs 0-based in array index
    result.row.end = (result.row.last ? (nrows + 2) : (i + 2)) + 1;

    return result;
  }

  addSubcomponent(d) {
    console.log("adding", d)
    const { facetedComponent } = this.options;
    const name = getFacetId(d);

    const subcomponent = new facetedComponent({
      placeholder: ".vzb-" + name,
      model: this.model,
      name,
      parent: this,
      root: this.root,
      state: {
        alias: this.state.alias,
        positionInRepeat: this.state.positionInRepeat
      },
      services: this.services,
      ui: this.ui,
      default_ui: this.DEFAULT_UI
    });
    this.children.push(subcomponent);
  }


  removeSubcomponent(d) {
    console.log("removing", d)
    const subcomponent = this.findChild({ name: getFacetId(d) });
    if (subcomponent) {
      subcomponent.deconstruct();
    }
  }
}

_Facet.DEFAULT_UI = {
};

export const Facet = decorate(_Facet, {
  "MDL": computed,
  "data": computed,
  "maxValues": computed,
  "scaleDomainRange": computed
});