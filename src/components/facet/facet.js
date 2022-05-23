import { BaseComponent } from "../base-component.js";
import { decorate, computed } from "mobx";
import * as utils from "../../legacy/base/utils.js"
import "./facet.scss";
import { runInAction } from "mobx";

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
    this.addReaction(this.updateSize);
  }

  updatePositionInRepeat() {
    this.children.forEach(child => child.state.positionInRepeat = this.state.positionInRepeat);
  }

  getDataForSubcomponent(id) {
    return [...this.data.get(id).values()];
  }

  sortFacets(map){
    return new Map([...map].sort((a, b) => {
      if (a[0].includes("is--")) return -1;
      if (b[0].includes("is--")) return 1;
    })) 
  }

  get data() {
    return this.sortFacets(this.model.dataMap.order("facet_row").groupByWithMultiGroupMembership("facet_row"));
  }

  howManyFacets() {
    return this.data.size;
  }

  get maxValues() {
    return [...this.data.keys()].map(key => {
      const sum = d3.sum([...this.data.get(key).values()].map(m=>m.maxheight));
      const limit = this.MDL.maxheight.config.limit;
      return {k: key, v: sum > limit ? limit : sum};
    })
  }

  get scaleDomain() {
    return d3.sum(this.maxValues.map(m => m.v));
  }

  updateLayoutProfile() {
    this.services.layout.size; //watch

    this.profileConstants = this.services.layout.getProfileConstants(
      this.options.facetedComponent.PROFILE_CONSTANTS , 
      this.options.facetedComponent.PROFILE_CONSTANTS_FOR_PROJECTOR
    );
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;

    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  propagateInteractivity(callback){
    this.children.forEach(chart => callback(chart));
  }

  updateSize() {
    this.services.layout.size; //watch
    this.services.layout.projector; //watch
    const minPx = this.profileConstants.minHeight;
    const totalPx = this.height - this.profileConstants.margin.top - this.profileConstants.margin.bottom;

    const facetKeys = [...this.data.keys()];
    if(JSON.stringify(facetKeys) + minPx + totalPx === this.resizeUpdateString) return;
    this.resizeUpdateString = JSON.stringify(facetKeys) + minPx + totalPx;

    let rangeParts = this.maxValues.map(m => null);
    let domainParts = this.maxValues.map(m => m.v);
    
    let maxIter = 5;
    let unallocatedDomain, unallocatedRange, residual = totalPx, allChartsSmall = false;
    const proportion = i => unallocatedRange * domainParts[i] / unallocatedDomain;   

    for(let iterate = 0; iterate < maxIter && residual > 1 && !allChartsSmall; iterate++){
      unallocatedRange = totalPx - d3.sum(rangeParts.filter(f => f == minPx));
      unallocatedDomain = d3.sum(domainParts.filter((f, i) => rangeParts[i] != minPx)); 
      rangeParts = rangeParts.map((r, i) => (r == minPx || proportion(i) < minPx) ? minPx : Math.floor(proportion(i)));
      allChartsSmall = rangeParts.every(e => e == minPx);
      residual = d3.sum(rangeParts) - totalPx;
    }
    
    const wastedHelperScale = d3.scaleLinear().domain([0, d3.max(domainParts)]).range([0, d3.max(rangeParts)]);
    const wastedRange = d3.sum(rangeParts.map((r, i) => r - wastedHelperScale(domainParts[i])));  
    this.scaleRange = totalPx - wastedRange;

    const templateString = rangeParts.map(m => m + "px").join(" ");
    this.element
      .style("grid-template-rows", `${this.profileConstants.margin.top}px ${templateString} ${this.profileConstants.margin.bottom}px`)
      .style("grid-template-columns", "1fr ".repeat(1));
  }

  addRemoveSubcomponents() {
    const { facetedComponentCssClass } = this.options;

    const facetKeys = [...this.data.keys()];

    if(JSON.stringify(facetKeys) === this.facetKeysString) return;
    this.facetKeysString = JSON.stringify(facetKeys);

    runInAction(() => {
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
    });
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
      const index = this.children.indexOf(subcomponent);
      if (index >= 0) this.children.splice(index, 1);
    }
  }
}

_Facet.DEFAULT_UI = {
};

export const Facet = decorate(_Facet, {
  "MDL": computed,
  "data": computed,
  "maxValues": computed,
  "scaleDomain": computed
});