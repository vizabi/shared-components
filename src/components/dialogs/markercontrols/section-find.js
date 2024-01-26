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
    this.entitiesWithMissingData = [];
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updatemissingDataForFrame);
    this.addReaction(this.updateSelection);
    this.addReaction(this.getEntitiesDeliberatelyAddedInFilterButMissingData);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getEntitiesDeliberatelyAddedInFilterButMissingData() {
    const entitiesWithMissingData = [];
    this.model.data.spaceCatalog.then(spaceCatalog => {
      for (const dim in spaceCatalog) {
        const filterSpec = this.model.encoding?.show?.data?.filter?.dimensions?.[dim] || {};
        if (spaceCatalog[dim].entities) {
          const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.find( f => f[dim])?.[dim]?.$in || [];
          [...spaceCatalog[dim].entities.filter(filterSpec).values()].forEach(entity => {
            if (dimOrIn.includes(entity[KEY]) && ![...this.parent.markersData.values()].some(s => s[dim] === entity[dim])) {
              const push = {
                [KEY]: entity[KEY],
                [dim]: entity[dim], 
                name: entity.name, 
                missingData: true
              };
              entitiesWithMissingData.push(push);
            }
            
          });
        }
      }

      this.entitiesWithMissingData = entitiesWithMissingData;
    });
  }

  createList() {
    this.listReady = false;
    let data = [...this.parent.markersData.values()]
      .concat(this.entitiesWithMissingData)
      .toSorted((a, b) => (a.name < b.name) ? -1 : 1);

    const primaryDimension = this.parent.ui.primaryDim ? this.parent.ui.primaryDim : this.model.data.space[0];
    data = d3.groups(data, d =>d[primaryDimension])
      .map(([key, children]) => ({
        [KEY]: key, 
        children, 
        name: children[0].label[primaryDimension], 
        missingData: children.every(child => child.missingData)
      }));
  
    const list = this.DOM.list.text("");

    this.DOM.listItems = list.selectAll("div")
      .data(data, d => d[KEY] )
      .join("div")
      .attr("class", "vzb-item vzb-dialog-checkbox")
      .call(this._createListItem.bind(this, data.length));

    this.listReady = true;
  }

  _createListItem(dataLength, listItem) {

    listItem.append("input")
      .attr("type", "checkbox")
      .classed("vzb-hidden", this.parent.ui.disableFindInteractions)
      .attr("id", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        if(this.parent.ui.disableFindInteractions) return;
        this.setModel.select(d);
        this.parent.DOM.content.node().scrollTop = 0;
        this.parent._clearSearch();
        this.parent.updateSearch();
      });

    listItem.append("label")
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
      });

    listItem.append("span")
      .attr("class", "vzb-closecross")
      .text("✖️")
      .classed("vzb-hidden", dataLength === 1)
      .on("click", (event, d) => {
        this.setModel.unhighlight(d);
        this.setModel.deselect(d);
        const principalDimension = this.model.data.space[0];
        this.parent.findChild({type: "SectionRemove"}).setModel(Object.assign({}, d, {prop: principalDimension, dim: principalDimension}));
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

  updatemissingDataForFrame() {
    if(!this.listReady) return;
    this.entitiesWithMissingData;
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
      .html(d => d.missingDataForFrame ? `<span>${d.name}</span> <span class=vzb-frame>${frame}</span>` : d.name)
      .attr("title", d => "key: " + d[KEY] + (d.missingDataForFrame ? ", " + noDataSubstr : ""));
  }

  example() {
    const data = [...this.parent.markersData.values()];
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
      const data = [...this.parent.markersData.values()];
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
  "entitiesWithMissingData": observable,
  "listReady": observable
});

export {decorated as SectionFind};