import { BaseComponent } from "../base-component.js";
import { decorate, observable, computed } from "mobx";
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

  setup(options) {
    this.direction = this.options.direction || "row";   
    super.setup(options);
  }

  get MDL() {
    return this.model;
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
    }));
  }

  get data() {
    const encoding = "facet_" + this.direction; 
    return this.sortFacets(this.model.dataMap.order(encoding).groupByWithMultiGroupMembership(encoding));
  }

  howManyFacets() {
    return this.data.size;
  }

  isRowDirection() {
    return this.direction == "row";
  }

  get maxValues() {
    let result;
    runInAction(() => { //prevent observing of this.data
      result = [...this.data.keys()].map(k => [k, null]);
    });
    return observable.map(result);
  }

  getScaleDomainForSubcomponent(id) {
    if (id)
      return this.maxValues.get(id) || 0;
    else
      return d3.sum(this.maxValues.values());
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

  get largetstFacetId(){
    if(this.ui.inpercent){
      return this.maxValues.at(-1).k;
    } else {
      const largest = {k: null, v: 0};
      this.maxValues.forEach(({k,v}) => {if(v > largest.v) {largest.v = v; largest.k = k}});
      return largest.k;
    }
  }

  updateSize() {
    this.services.layout.size; //watch
    this.services.layout.projector; //watch
    this.ui.inpercent;

    const isRowDirection = this.isRowDirection();
    const facetKeys = [...this.maxValues.keys()];
    const domainParts = [...this.maxValues.values()];
    const {
      margin,
      minHeight = 1,
      minWidth = 1
    } = this.profileConstants;

    const minPx = (isRowDirection ? minHeight : minWidth);
    const betweenPx = (isRowDirection ? margin.betweenRow : margin.betweenColumn) || 0;
    const totalPx = (isRowDirection ? (this.height - margin.top - margin.bottom) : (this.width - margin.left - margin.right)) - betweenPx * (facetKeys.length - 1);

    const getUpdateStr = () => JSON.stringify(facetKeys) + JSON.stringify(domainParts) + minPx + totalPx + this.ui.inpercent;
    if(getUpdateStr() === this.resizeUpdateString) return;
    this.resizeUpdateString = getUpdateStr();

    let rangeParts = domainParts.map(m => null);

    if (this.ui.inpercent){
      this.scaleRange = totalPx / domainParts.length < minPx ? minPx : totalPx / domainParts.length;
      rangeParts = rangeParts.map(m => this.scaleRange);
    } else {
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
    }

    const last = this.howManyFacets() - 1;
    const first = 0;
    const templateString = {
      dominant: rangeParts
        .map((m, i) => ""
          + `[start_${i}]` 
          + (i == first ? (isRowDirection ? ` ${margin.top}px ` : ` ${margin.left}px `) : ` ${betweenPx * 0.5}px `)
          + ` ${m || 1}px `
          + (i == last ? (isRowDirection ? ` ${margin.bottom}px ` : ` ${margin.right}px `) : ` ${betweenPx * 0.5}px `)
          + `[end_${i}]`
        )
        .join(" 0px "),
      non_dominant: " 1fr"
    };
    this.element
      .style("grid-template-columns", templateString[isRowDirection ? "non_dominant" : "dominant"])
      .style("grid-template-rows", templateString[isRowDirection ? "dominant" : "non_dominant"]);

    this.rangePartsHash = rangeParts.join(",");
  }

  addRemoveSubcomponents() {
    const { facetedComponentCssClass } = this.options;

    const facetKeys = [...this.data.keys()];

    if(JSON.stringify(facetKeys) === this.facetKeysString) return;
    this.facetKeysString = JSON.stringify(facetKeys);

    const isRowDirection = this.isRowDirection();

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
        .style("grid-row-start", (d, i) => "start_" + (isRowDirection ? i : 0))
        .style("grid-row-end", (d, i) => "end_" + (isRowDirection ? i : 0))
        .style("grid-column-start", (d, i) => "start_" + (isRowDirection ? 0 : i))
        .style("grid-column-end", (d, i) => "end_" + (isRowDirection ? 0 : i))

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
    const isRowDirection = this.isRowDirection();
    const ncolumns = isRowDirection ? 1 : [...this.data.keys()].length;
    const nrows =  isRowDirection ? [...this.data.keys()].length : 1;
    const result = {
      row: firstLastOrMiddle(isRowDirection ? i : 0, nrows),
      column: firstLastOrMiddle(isRowDirection ? 0 : i, ncolumns)
    }

    result.row.start = (result.row.first ? 0 : (i + 1)) + 1; //+1 is correction for 1-based numbers in css vs 0-based in array index
    result.row.end = (result.row.last ? (nrows + 2) : (i + 2)) + 1;
    result.column.start = (result.column.first ? 0 : (i + 1)) + 1; //+1 is correction for 1-based numbers in css vs 0-based in array index
    result.column.end = (result.column.last ? (ncolumns + 2) : (i + 2)) + 1;

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
  "scaleRange": observable,
  "maxValues": computed,
  "largetstFacetId": computed,
  "rangePartsHash": observable
});