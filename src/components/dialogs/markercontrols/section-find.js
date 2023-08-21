import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import {decorate, computed} from "mobx";
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
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updateBrokenData);
    this.addReaction(this._selectDataPoints);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }


  _processFramesData() {
    const data = new Map();
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      if (!data.has(key)) data.set(key, { 
        [KEY]: key, 
        name: this._getCompoundLabelText(valuesObj)
      });
    }));
    return data;
  }

  createList() {
    const list = this.DOM.list;

    const data = [...this._processFramesData().values()];

    //sort data alphabetically
    data.sort((a, b) => (a.name < b.name) ? -1 : 1);

    this.DOM.listItems = list.text("").selectAll("div")
      .data(data, function(d) { return d[KEY]; })
      .join("div")
      .attr("class", "vzb-item vzb-dialog-checkbox")
      .call(this._createListItem.bind(this));
  }

  _createListItem(listItem) {
    listItem.append("input")
      .attr("type", "checkbox")
      .attr("id", (d, i) => "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        //clear highlight so it doesn't get in the way when selecting an entity
        if (!utils.isTouchDevice()) this.MDL.highlighted.data.filter.delete(d);
        this.MDL.selected.data.filter.toggle(d);
        //this.DOM.panelFind.node().scrollTop = 0;
        //return to highlighted state
        if (!utils.isTouchDevice() && !d.brokenData) this.MDL.highlighted.data.filter.set(d);
      });

    listItem.append("label")
      .attr("for", (d, i) => "-find-" + i + "-" + this.id)
      .text(d => d.name)
      .on("mouseover", (event, d) => {
        if (!utils.isTouchDevice() && !d.brokenData) this.MDL.highlighted.data.filter.set(d);
      })
      .on("mouseout", (event, d) => {
        if (!utils.isTouchDevice()) this.MDL.highlighted.data.filter.delete(d);
      });
  }

  _getCompoundLabelText(d) {
    if (typeof d.label == "object") {
      return Object.entries(d.label)
        .filter(([k, v]) => k != this.MDL.frame.data.concept)
        .map(([k, v]) => utils.isNumber(v) ? (k + ": " + v) : v)
        .join(", ");
    }
    if (d.label != null) return "" + d.label;
    return d[KEY];
  }

  updateBrokenData() {
    const currentDataMap = this.model.dataMap;
    const listItems = this.DOM.listItems;

    listItems.data().forEach(d => {
      d.brokenData = !currentDataMap.hasByStr(d[KEY]);
    });

    this._updateLabelTitle();
  }

  _updateLabelTitle() {
    const noDataSubstr = this.localise(this.MDL.frame.value) + ": " + this.localise("hints/nodata");
    this.DOM.listItems.select("label")
      .classed("vzb-find-item-brokendata", d => d.brokenData)
      .attr("title", d => "key: " + d[KEY] + (d.brokenData ? ", " + noDataSubstr : ""));
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
    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hide = !(d.name || "").toString().toLowerCase().includes(text);
        hiddenItems += hide;
        return hide;
      });
    this.showHideHeader(items.size() - hiddenItems);
  }

  concludeSearch(text = "") {

    const data = [...this._processFramesData().values()];
    const filtered = data.filter(f => (f.name || "").toString().toLowerCase().includes(text));
    if (filtered.length === 1) {
      this.MDL.selected.data.filter.toggle(filtered[0]);
      this.updateSearch();
    }
  }

}

const decorated = decorate(SectionFind, {
  "MDL": computed
});

export {decorated as SectionFind};