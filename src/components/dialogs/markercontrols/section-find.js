import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import {decorate, computed, runInAction, observable} from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");
function _getLeafChildren(d, result = []) {
  if (d.folder) {
    d.children.forEach(_d => _getLeafChildren(_d, result))
  } else {
    result.push(...d.children);
  }
  return result;
}

function _getLeafChildrenCount(d, result = [0]) {
  if (d.folder) {
    d.children.forEach(_d => _getLeafChildrenCount(_d, result))
  } else {
    result[0] += d.children.length;
  }
  return result[0];
}

function nameLocaleCompare(a, b) {
  return a.name.localeCompare(b.name);
}

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
    this.drilldownValues = new Map();
    this.listData = [];

  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updatemissingDataForCurrentFrame);
    this.addReaction(this.updateSelection);
    this.addReaction(this.getEntitiesExplicitlyAddedInFilterButMissingDataInAllFrames);
    this.addReaction(this.getDrilldownValues);
    this.addReaction(this.getListData);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getDrilldownValues() {
    if (!this.isFindInFolderView()) return;
    const dim = this._getPrimaryDim();
    const drilldownProps = this._getDrilldownProps();
    const entityQuery = {
      select: {
          key: [dim],
          value: [...drilldownProps, "name"]
      },
      from: "entities",
      locale: this.model.data.source.locale,
    };
    
    this.model.data.source.query(entityQuery).then(response => {
      this.drilldownValues = response.forQueryKey();
    });
  }

  // getDrilldownValues2() {
  //   const primaryDim = this._getPrimaryDim();
  //   const data = this._foldEntityListToPrimaryDimension(
  //     this.parent.marksFromAllFrames
  //       .concat(this.entitiesWithMissingDataInAllFrames)
  //       .toSorted((a, b) => (a.name < b.name) ? -1 : 1)
  //   );
  //   Promise.all(data.map(d=>{
  //     return this.model.data.source.drillup({
  //       dim: primaryDim,
  //       entity: d.children[0][primaryDim]
  //     })
  //   })).then(result=>{
  //     console.log(result);
  //   })

  // }

  getListData() {
    const flatData = this._foldEntityListToPrimaryDimension(
      this.parent.marksFromAllFrames
        .concat(this.entitiesWithMissingDataInAllFrames)
        .toSorted((a, b) => (a.name < b.name) ? -1 : 1)
    );  

    if (!this.isFindInFolderView()) {
      this.listData = flatData;
      return;
    }
    if (!this.drilldownValues.size) return;

    const dim = this._getPrimaryDim(); 
    const drilldownProps = this._getDrilldownProps();    
    
    flatData.forEach(d => {
      drilldownProps.forEach(prop => {
        d[prop] = this.drilldownValues.get(d.children[0][dim])?.[prop];
      })
    });

    const mapGroupData = ([key, children], i) => {
      if (!key) return (children[0]?.[0] && children[0]?.[1]) ? children.map(mapGroupData) : children[0]?.[1] ? mapGroupData(children[0], i) : i === undefined ? children : children[0];
      return {
        [KEY]: key, 
        children: children[0]?.[0] ? children.map(mapGroupData) : children[0]?.[1] ? mapGroupData(children[0]) : children,
        name: this.drilldownValues.get(key).name,
        folder: true
      };
    }
    
    const result = mapGroupData([null, d3.groups.apply(null, [flatData, ...drilldownProps.map(prop => d => d[prop])])]);
    
    this.listData = result.sort(nameLocaleCompare);
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
  
    const list = this.DOM.list.text("");

    this.DOM.listItems = list.selectAll("div")
      .data(this.listData, d => d[KEY] )
      .join("div")
      .attr("class", d => `vzb-item vzb-item-toplevel vzb-dialog-checkbox ${d.folder ? "vzb-item-folder" : ""}`)
      .call(this._createListItem.bind(this, this.listData.length));

    this.listReady = true;
  }

  isFindInFolderView() {
    return this._getDrilldownProps().length != 0;
  }

  _getPrimaryDim() {
    return this.parent.ui.primaryDim || this.model.data.space[0];
  }

  _getDrilldownProps() {
    return this.parent.ui.drilldown?.split?.(".") || [];
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
    if (listItem.empty()) return;

    const _this = this;
    listItem.append("input")
      .attr("type", "checkbox")
      .attr("id", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        if (this.parent.ui.disableFindInteractions) return;
        if (event.target.checked) {
          this.setModel.select(d);
        } else {
          this.setModel.deselect(d);
        }
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
      .each(function(d) {
        const view = d3.select(this);
        view.append("span")
          .attr("class", "vzb-label")
          .text(d => d.name)
          .on("click", function(event, d) {
            if (!d.folder) return;
            
            event.stopPropagation();
            event.preventDefault();
            const view = d3.select(this.parentNode.parentNode);
            const isOpened = view.classed("vzb-item-opened");
            if (isOpened) {
              view.classed("vzb-item-opened", false);
              view.selectAll(".vzb-item.vzb-item-folder").classed("vzb-item-opened", false);
            } else {
              view.classed("vzb-item-opened", true);
            }
          });
        view.append("span").attr("class", "vzb-frame");
      });

    if (listItem.datum().folder) {
      listItem.append("span").attr("class", "vzb-folder-mark")
        .on("click", function(event, d) {
          const view = d3.select(this.parentNode);
          const isOpened = view.classed("vzb-item-opened");
          if (isOpened) {
            view.classed("vzb-item-opened", false);
            view.selectAll(".vzb-item.vzb-item-folder").classed("vzb-item-opened", false);
          } else {
            view.classed("vzb-item-opened", true);
          }
        });
    }

    listItem.append("span")
      .attr("class", "vzb-closecross")
      .text("✖️")
      .classed("vzb-hidden", dataLength === 1)
      .on("click", (event, d) => {
        this.setModel.unhighlight(d);
        this.setModel.deselect(d);
        const primaryDimension = this._getPrimaryDim();
        this.model.data.filter.deleteUsingLimitedStructure({key: d[KEY], dim: primaryDimension, prop: primaryDimension});
        this.parent._clearSearch();
        this.parent.updateSearch();
      });

    listItem.each(function(d){
      if (d.folder) {
        d.children.sort(nameLocaleCompare);
        const view = d3.select(this);
        view.append("div")
          .attr("class", "vzb-item-children")
          .selectAll("div")
            .data(d.children, d => d[KEY] )
            .join("div")
            .attr("class", d => `vzb-item vzb-dialog-checkbox ${d.folder ? "vzb-item-folder" : ""}`)
            .call(_this._createListItem.bind(_this, d.children.length));
      }
    });
  }

  setModel = {
    select: (d) => {
      if (d.missingData) return;
      runInAction(() => _getLeafChildren(d).forEach(child => this.MDL.selected.data.filter.toggle(child)));
    },
    deselect: (d) => {
      runInAction(() => _getLeafChildren(d).forEach(child => this.MDL.selected.data.filter.delete(child)));
    },
    highlight: (d) => {
      if (d.missingDataForFrame || d.missingData) return;
      runInAction(() => _getLeafChildren(d).forEach(child => this.MDL.highlighted.data.filter.set(child)));
    },
    unhighlight: (d) => {
      runInAction(() => _getLeafChildren(d).forEach(child => this.MDL.highlighted.data.filter.delete(child)));
    },
  }

  updatemissingDataForCurrentFrame() {
    if(!this.listReady) return;
    this.entitiesWithMissingDataInAllFrames;
    const currentDataMap = this.model.dataMap;
    const listItems = this.DOM.list.selectAll(".vzb-item");

    listItems.data().forEach(d => {
      d.missingDataForFrame = !d.missingData && _getLeafChildren(d).every(child => !currentDataMap.hasByStr(child[KEY]));
    });

    const frame = this.localise(this.MDL.frame.value);
    const noDataSubstr = frame + ": " + this.localise("hints/nodata");
    listItems.select("label")
      .classed("vzb-find-item-missingDataForFrame", d => d.missingDataForFrame)
      .classed("vzb-find-item-missingData", d => d.missingData)
      .attr("title", d => "key: " + d[KEY] + (d.missingDataForFrame ? ", " + noDataSubstr : ""))
      //the HTML parsing here takes a very long CPU time! instead the .each() is faster
      //.html(d => d.missingDataForFrame ? `<span>${d.name}</span> <span class=vzb-frame>${frame}</span>` : d.name)
      .each(function(d) {
        const view = d3.select(this);
        //view.select(".vzb-label").text(d.name);
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
    this.DOM.list.selectAll("input")
      .property("checked", function(d) {
        const isSelected = selected.has(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });

    this.DOM.list.selectAll(".vzb-item-folder").each(function(d) {
      const folderItemElement = d3.select(this);
      const checkedCount = folderItemElement.selectAll(".vzb-checked").size();
      const itemCount = _getLeafChildrenCount(d);
      folderItemElement.select("input")
        .property("checked", checkedCount)
        .property("indeterminate", checkedCount && checkedCount != itemCount);
    });

    const leafItems = this.DOM.list.selectAll(":not(:has(.vzb-item-children)).vzb-item-children");
    const checkedItems = leafItems.selectAll(".vzb-checked");
    leafItems.selectAll(".vzb-item:not(.vzb-checked)")
      .sort(nameLocaleCompare)
      .classed("vzb-separator", false);
    checkedItems
      .lower()
      .sort(nameLocaleCompare)
      .classed("vzb-separator", (d, i, g) => i == g.length - 1);
  }

  updateSearch(text = "") {
    if(!this.listReady) return;
    let hiddenItems = 0;

    const items = this.DOM.list.selectAll(".vzb-item:not(.vzb-item-folder)").each(function(d) {
      const view = d3.select(this);
      const hide = !(d.name || "").toString().toLowerCase().includes(text);
      hiddenItems += +(text && hide);
      view.classed("vzb-hidden", text && hide);
      view.classed("vzb-item-insearch", text && !hide);
    });
    this.DOM.list.selectAll(".vzb-item-folder").classed("vzb-item-insearch", text);
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
  "listReady": observable,
  "drilldownValues": observable.struct,
  "listData": observable.struct
});

export {decorated as SectionFind};