import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import {decorate, computed, runInAction, observable} from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");
const mapToArray = m => [...m.entries()].map(([key, values]) => ({[KEY]: key, name: key, children: values}));

class SectionFind extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Find");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    this.entitiesWithMissingData = [];
    this.foldListBy = "geo"; //hide age and decile from the list
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updatemissingDataForFrame);
    this.addReaction(this._selectDataPoints);
    this.addReaction(this.getEntitiesWithMissingData);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getEntitiesWithMissingData() {
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
    let data = [...this.parent.markersData.values()]
      .concat(this.entitiesWithMissingData)
      .toSorted((a, b) => (a.name < b.name) ? -1 : 1);

    const spaceWithoutFrame = this.model.data.space.filter(f => f !== this.MDL.frame.data.concept);
    spaceWithoutFrame.pop();

    if (spaceWithoutFrame.length) {
      const args = [
        data,
      ].concat(
        spaceWithoutFrame.map(dim => function(d){return d[dim];})
      );
      data = mapToArray(d3.group.apply(this, args));
    }
    
    data.forEach(d => d.show = true);
    const list = this.DOM.list.text("");
    this._createGroup(list, data);
    this.DOM.listItems = list.selectAll(".vzb-item");
  }

  _createGroup(list, data){
    this.DOM.listItems = list.selectAll("div")
      .data(data, d => d[KEY] )
      .join("div")
      .call(this._createListItem.bind(this));
  }

  interact = {
    mouseover: (d) => {
      if (!d.missingDataForFrame) this.MDL.highlighted.data.filter.set(d);
    },
    mouseout: (d) => {
      this.MDL.highlighted.data.filter.delete(d);
    },
  }

  _createListItem(listItem) {
    const _this = this;

    const checkbox = listItem.append("div")
      .attr("class", "vzb-item vzb-dialog-checkbox")
      .classed("vzb-hidden", d => !d.show);

    checkbox.append("input")
      .attr("type", "checkbox")
      .attr("id", (d, i) => "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        //clear highlight so it doesn't get in the way when selecting an entity
        if (!utils.isTouchDevice()) this.MDL.highlighted.data.filter.delete(d);
        this.MDL.selected.data.filter.toggle(d);
        //this.DOM.panelFind.node().scrollTop = 0;
        //return to highlighted state
        if (!utils.isTouchDevice() && !d.missingDataForFrame) this.MDL.highlighted.data.filter.set(d);
        d.children.forEach(f => f.show = true);
        _this.updateSearch();
      });

    checkbox.append("label")
      .attr("for", (d, i) => "-find-" + i + "-" + this.id)
      .on("mouseover", (event, d) => {
        if (utils.isTouchDevice()) return;
        if (d.children) 
          runInAction(() => d.children.forEach(child => this.interact.mouseover(child))); 
        else
          this.interact.mouseover(d);
      })
      .on("mouseout", (event, d) => {
        if (utils.isTouchDevice()) return;
        if (d.children) 
          runInAction(() => d.children.forEach(child => this.interact.mouseout(child))); 
        else
          this.interact.mouseout(d);
      });


    listItem.each(function(d) {
      if (d.children) {
        const view = d3.select(this).append("div").attr("class", "vzb-subset");
        _this._createGroup(view, d.children);
      }
    });
  }

  updatemissingDataForFrame() {
    this.entitiesWithMissingData;
    const currentDataMap = this.model.dataMap;
    const listItems = this.DOM.listItems;

    listItems.data().forEach(d => {
      d.missingDataForFrame = !currentDataMap.hasByStr(d[KEY]) && !d.missingData && !d.children;
    });

    const frame = this.localise(this.MDL.frame.value);
    const noDataSubstr = frame + ": " + this.localise("hints/nodata");
    this.DOM.listItems.select("label")
      .classed("vzb-find-item-missingDataForFrame", d => d.missingDataForFrame)
      .classed("vzb-find-item-missingData", d => d.missingData)
      .html(d => d.missingDataForFrame ? `<span>${d.name}</span> <span class=vzb-frame>${frame}</span>` : ((d.children ? "▶" : "") + d.name))
      .attr("title", d => "key: " + d[KEY] + (d.missingDataForFrame ? ", " + noDataSubstr : ""));
  }

  example() {
    const data = [...this.parent.markersData.values()];
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  _selectDataPoints() {
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
    let hiddenItems = 0;

    const spaceWithoutFrame = this.model.data.space.filter(f => f !== this.MDL.frame.data.concept);
    spaceWithoutFrame.pop();

    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hide = !(d.name || "").toString().toLowerCase().includes(text) || spaceWithoutFrame.length && !d.show;
        hiddenItems += hide;
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
  "entitiesWithMissingData": observable
});

export {decorated as SectionFind};