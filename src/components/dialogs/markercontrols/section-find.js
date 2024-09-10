import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import {decorate, computed, runInAction, observable} from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");

class SectionFind extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Find");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    this.listReady = false;
    this.entitiesWithMissingDataInAllFrames = [];
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updatemissingDataForCurrentFrame);
    this.addReaction(this.updateSelection);
    this.addReaction(this.getEntitiesExplicitlyAddedInFilterButMissingDataInAllFrames);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getEntitiesExplicitlyAddedInFilterButMissingDataInAllFrames() {
    const entitiesWithMissingDataInAllFrames = [];
    this.model.data.spaceCatalog.then(spaceCatalog => {
      
      //after we decided to make the list folded to first dimension only there is no need for multidimensionality
      //otherwise here we would use: for (const dim in spaceCatalog) { instead of fixing dim to a constant
      const dim = this._getPrimaryDim(); 
      const filterSpecFromShow = this.model.encoding?.show?.data?.filter?.dimensions?.[dim] || {};
      if (spaceCatalog[dim].entities) {
        const explicitlyAddedEntities = this.model.data.filter.dimensions?.[dim]?.$or?.find( f => f[dim])?.[dim]?.$in || [];
        const allowedEntities = [...spaceCatalog[dim].entities.filter(filterSpecFromShow).values()];
        allowedEntities.forEach(entity => {
          if (explicitlyAddedEntities.includes(entity[KEY]) && !this.parent.marksFromAllFrames.some(s => s[dim] === entity[dim])) {
            const push = {
              [KEY]: entity[KEY],
              [dim]: entity[dim], 
              name: entity.name, 
              missingData: true
            };
            entitiesWithMissingDataInAllFrames.push(push);
          }
          
        });
      }
      this.entitiesWithMissingDataInAllFrames = entitiesWithMissingDataInAllFrames;
    });
  }

  createList() {
    this.listReady = false;
    const data = this._foldEntityListToPrimaryDimension(
      this.parent.marksFromAllFrames
        .concat(this.entitiesWithMissingDataInAllFrames)
        .toSorted((a, b) => (a.name < b.name) ? -1 : 1)
    );  
  
    const list = this.DOM.list.text("");

    this.DOM.listItems = list.selectAll("div")
      .data(data, d => d[KEY] )
      .join("div")
      .attr("class", "vzb-item vzb-dialog-checkbox")
      .call(this._createListItem.bind(this, data.length));

    this.listReady = true;
  }

  _getPrimaryDim() {
    return this.parent.ui.primaryDim || this.model.data.space[0];
  }

  _foldEntityListToPrimaryDimension(data) {
    const primaryDimension = this._getPrimaryDim();
    return d3.groups(data, d =>d[primaryDimension])
      .map(([key, children]) => ({
        [KEY]: key, 
        children, 
        name: children[0].label?.[primaryDimension] || children[0].name, 
        missingData: children.every(child => child.missingData)
      }));
  }

  _createListItem(dataLength, listItem) {

    listItem.append("input")
      .attr("type", "checkbox")
      .attr("id", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        if(this.parent.ui.disableFindInteractions) return;
        this.setModel.select(d);
        this.parent.DOM.content.node().scrollTop = 0;
        this.parent._clearSearch();
        this.parent.updateSearch();
      });

    listItem.append("label")
      .classed("vzb-disabled", this.parent.ui.disableFindInteractions)
      .attr("for", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("mouseover", (event, d) => {
        if (utils.isTouchDevice()) return;
        if(this.parent.ui.disableFindInteractions) return;
        this.setModel.highlight(d);
      })
      .on("mouseout", (event, d) => {
        if (utils.isTouchDevice()) return;
        if(this.parent.ui.disableFindInteractions) return;
        this.setModel.unhighlight(d);
      })
      .each(function(){
        const view = d3.select(this);
        view.append("span").attr("class", "vzb-label");
        view.append("span").attr("class", "vzb-frame");
      });

    listItem.append("span")
      .attr("class", "vzb-closecross")
      .text("✖️")
      .classed("vzb-hidden", dataLength === 1)
      .on("click", (event, d) => {
        this.setModel.unhighlight(d);
        this.setModel.deselect(d);
        const primaryDimension = this._getPrimaryDim();
        this.parent.findChild({type: "SectionRemove"}).setModel(Object.assign({}, d, {prop: primaryDimension, dim: primaryDimension}));
        this.parent._clearSearch();
        this.parent.updateSearch();
      });
  }

  setModel = {
    select: (d) => {
      if (d.missingData) return;
      runInAction(() => d.children.forEach(child => this.MDL.selected.data.filter.toggle(child)));
    },
    deselect: (d) => {
      runInAction(() => d.children.forEach(child => this.MDL.selected.data.filter.delete(child)));
    },
    highlight: (d) => {
      if (d.missingDataForFrame || d.missingData) return;
      runInAction(() => d.children.forEach(child => this.MDL.highlighted.data.filter.set(child)));
    },
    unhighlight: (d) => {
      runInAction(() => d.children.forEach(child => this.MDL.highlighted.data.filter.delete(child)));
    },
  }

  updatemissingDataForCurrentFrame() {
    if(!this.listReady) return;
    this.entitiesWithMissingDataInAllFrames;
    const currentDataMap = this.model.dataMap;
    const listItems = this.DOM.listItems;

    listItems.data().forEach(d => {
      d.missingDataForFrame = !d.missingData && d.children.every(child => !currentDataMap.hasByStr(child[KEY]));
    });

    const frame = this.localise(this.MDL.frame.value);
    const noDataSubstr = frame + ": " + this.localise("hints/nodata");
    this.DOM.listItems.select("label")
      .classed("vzb-find-item-missingDataForFrame", d => d.missingDataForFrame)
      .classed("vzb-find-item-missingData", d => d.missingData)
      .attr("title", d => "key: " + d[KEY] + (d.missingDataForFrame ? ", " + noDataSubstr : ""))
      //the HTML parsing here takes a very long CPU time! instead the .each() is faster
      //.html(d => d.missingDataForFrame ? `<span>${d.name}</span> <span class=vzb-frame>${frame}</span>` : d.name)
      .each(function(d) {
        const view = d3.select(this);
        view.select(".vzb-label").text(d.name);
        view.select(".vzb-frame").text(d.missingDataForFrame ? frame : "");
      });
  }

  example() {
    const data = this.parent.marksFromAllFrames;
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  updateSelection() {
    if(!this.listReady) return;
    const selected = this.MDL.selected.data.filter;
    this.DOM.listItems.order().select("input")
      .property("checked", function(d) {
        const isSelected = selected.has(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });
    
    const checkedItems = this.DOM.list.selectAll(".vzb-checked");
    checkedItems
      .lower()
      .classed("vzb-separator", (d, i) => !i);    
  }

  updateSearch(text = "") {
    if(!this.listReady) return;
    let hiddenItems = 0;

    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hide = text && !(d.name || "").toString().toLowerCase().includes(text);
        hiddenItems += +hide;
        return hide;
      });
    this.showHideHeader(items.size() - hiddenItems);
  }

  getListItemCount() {
    return this.DOM.list.selectAll(".vzb-item:not(.vzb-hidden)").size();
  }

  concludeSearch(text = "") {
    runInAction(() => {
      const data = this.parent.marksFromAllFrames;
      const filtered = data.filter(f => (f.name || "").toString().toLowerCase().includes(text));
      if (filtered.length === 1) {
        this.MDL.selected.data.filter.toggle(filtered[0]);
        this.updateSearch();
      }
    });
  }

}

const decorated = decorate(SectionFind, {
  "MDL": computed,
  "entitiesWithMissingDataInAllFrames": observable,
  "listReady": observable
});

export {decorated as SectionFind};