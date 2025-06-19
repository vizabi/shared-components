import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import { ICON_CLOSE as iconClose } from "../../../icons/iconset";
import {decorate, computed, runInAction, observable} from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");
function _getLeafChildren(d, result = []) {
  if (d.folder) {
    d.children.forEach(_d => _getLeafChildren(_d, result));
  } else {
    result.push(...d.children);
  }
  return result;
}

function _getLeafChildrenCount(d, result = [0]) {
  if (d.folder) {
    d.children.forEach(_d => _getLeafChildrenCount(_d, result));
  } else {
    result[0] += d.children.length;
  }
  return result[0];
}

function nameLocaleCompare(a, b) {
  return a.name.localeCompare(b.name);
}

function folderAndNameLocaleCompare(a, b) {
  return (a.folder || 0) - (b.folder || 0) || a.name.localeCompare(b.name);
}

function scrollTopTween(scrollTop) { 
  return function() { 
    var i = d3.interpolateNumber(this.scrollTop, scrollTop); 
    return function(t) { this.scrollTop = i(t); }; 
  }; 
}

function sortItems(groups) {
  const items = groups.selectChildren(".vzb-item:not(.vzb-item-folder)");
  items.filter(":not(.vzb-checked)")
    .sort(nameLocaleCompare)
    .classed("vzb-separator", false);
  items.filter(".vzb-checked")
    .lower()
    .sort(nameLocaleCompare)
    .classed("vzb-separator", (d, i, g) => i == g.length - 1);
}

class SectionFind extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.selectDialog = this.DOM.content.append("div").attr("class", "vzb-find-select-dialog vzb-hidden");
    this.DOM.selectDialog.append("div").attr("class", "vzb-find-select-dialog-title");
    this.DOM.selectDialog.append("div").attr("class", "vzb-find-select-dialog-close");
    this.DOM.contextDialog = this.DOM.content.append("div").attr("class", "vzb-find-context-dialog vzb-hidden");
    this.DOM.contextDialog.append("div").attr("class", "vzb-find-context-dialog-title");
    this.DOM.contextDialog.append("div").attr("class", "vzb-find-context-dialog-close");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    this.listReady = false;
    this.entitiesWithMissingDataInAllFrames = [];
    this.drilldownValues = new Map();
    this.listData = [];
    this.listScrollTransitionFlag = false;
    this._initSelectDialog();
    this._initContextDialog();
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updatemissingDataForCurrentFrame);
    this.addReaction(this.updateSelection);
    this.addReaction(this.getEntitiesExplicitlyAddedInFilterButMissingDataInAllFrames);
    this.addReaction(this.getDrilldownValues);
    this.addReaction(this.getListData);
    this.addReaction(this.hideColorListinColorDialog);
  }

  get MDL() {
    return {
      color: this.model.encoding.color,
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getDrilldownValues() {
    if (!this.isFindInFolderView()) return;
    const dim = this._getPrimaryDim();
    const drilldownProps = this._getDrilldownProps();
    const isnessProps = drilldownProps.map(m => "is--" + m);
    const entityQuery = {
      select: {
        key: [dim],
        value: [...drilldownProps, ...isnessProps, "name"]
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
        const ddValue = this.drilldownValues.get(d.children[0][dim]);
        d[prop] = ddValue?.[prop];
        d.prop = ddValue ? drilldownProps.find(prop => ddValue["is--" + prop]) : null;
      });
    });

    const mapChildren = (children) => {
      const index = children.findIndex(c => !c[0]);
      if (index !== -1) {
        return children.slice(0, index).concat(children.slice(index + 1)).map(mapGroupData).concat(mapGroupData(children[index]));
      } else {
        return children.map(mapGroupData);
      }
    };

    const mapGroupData = ([key, children], i) => {
      if (!key) return (!children[0]?.children) ? mapChildren(children) : children[0]?.[1] ? mapGroupData(children[0], i) : i === undefined ? children : children[0];
      const ddValue = this.drilldownValues.get(key);
      return Object.assign({
        children: (!children[0]?.children) ? mapChildren(children) : children[0]?.[1] ? mapGroupData(children[0]) : children,
        prop: drilldownProps.find(prop => ddValue["is--" + prop]),
        folder: true
      }, ddValue);
    };
    
    const result = mapGroupData([null, d3.groups.apply(null, [flatData, ...drilldownProps.map(prop => d => d[prop])])]);
    
    this.listData = result.sort(folderAndNameLocaleCompare);
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
    this.DOM.title.text(this.localise("markercontrols/section/find"));
    this.listReady = false;
    const isFindInFolderView = this.isFindInFolderView();
    const colorFields = this.colorFields;

    const list = this.DOM.list.text("");

    this.DOM.listItems = list.selectAll("div")
      .data(this.listData, d => d[KEY] )
      .join("div")
      .attr("class", d => `vzb-item vzb-item-toplevel vzb-dialog-checkbox ${d.folder ? "vzb-item-folder" : ""}`)
      .call(this._createListItem.bind(this, isFindInFolderView ? d3.sum(this.listData.map(d => _getLeafChildrenCount(d))) : this.listData.length, colorFields));

    if (isFindInFolderView) {
      this.DOM.listItems = this.DOM.list.selectAll(".vzb-item");
    } 

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

  _createListItem(dataLength, colorFields, listItem) {
    if (listItem.empty()) return;

    const _this = this;
    const colorConcept = this.MDL.color.data.concept;

    listItem.append("input")
      .attr("type", "checkbox")
      .attr("id", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("change", (event, d) => {
        if (this.parent.ui.disableFindInteractions) return;
        
        const itemNode = event.target.parentNode;
        const separatorNode = d3.select(itemNode.parentNode).selectChildren(".vzb-separator").node();
        const contentNode = this.parent.DOM.content.node();
        const scrollDelta = itemNode.offsetTop - (separatorNode?.offsetTop || 0);
        const newScrollTop = contentNode.scrollTop - scrollDelta + (scrollDelta > 0 ? itemNode.clientHeight * 2 : -itemNode.clientHeight);

        if (!(event.target.checked && d.folder)) this.setModel.unhighlight(d);
        if (event.target.checked) {
          if (d.folder) {
            event.target.checked = false;
            this._bindSelectDialogItems(d);
            this.DOM.selectDialog.classed("vzb-hidden", false);

            //calculate offset to position the floating dialog
            const itemNodeBBInfo = itemNode.getBoundingClientRect();
            const contentNodeBBInfo = contentNode.getBoundingClientRect();
            const itemLabelHeight = itemNode.firstElementChild.nextElementSibling.offsetHeight;
            const offset = itemNodeBBInfo.top - contentNodeBBInfo.top + contentNode.scrollTop + itemLabelHeight * 0.6;
            this.DOM.selectDialog.style("top", offset + "px");
          } else {
            this.setModel.select(d);
          }
        } else {
          this.setModel.deselect(d);
        }

        this.listScrollTransitionFlag = true;
        utils.defer(() => {
          if (d.folder) {
            this.parent.DOM.content.interrupt();
            this.listScrollTransitionFlag = false;
          } else if (scrollDelta <= 0) {
            this.parent.DOM.content.interrupt();
            contentNode.scrollTop = newScrollTop;
            this.listScrollTransitionFlag = false;
          } else {
            this.parent.DOM.content.transition()
              .duration(300) 
              .tween("scrollTopTween", scrollTopTween(newScrollTop))
              .on("end", () => {
                this.listScrollTransitionFlag = false;
              });
          }
        });
      
        this.parent._clearSearch();
        this.parent.updateSearch();
      });

    listItem.append("label")
      .classed("vzb-disabled", this.parent.ui.disableFindInteractions)
      .attr("for", (d, i) => d[KEY] + "-find-" + i + "-" + this.id)
      .on("mouseover", (event, d) => {
        if (utils.isTouchDevice()) return;
        if (this.listScrollTransitionFlag) return;
        if (this.parent.ui.disableFindInteractions) return;
        this.setModel.highlight(d);
      })
      .on("mouseout", (event, d) => {
        if (utils.isTouchDevice()) return;
        if (this.listScrollTransitionFlag) return;
        if (this.parent.ui.disableFindInteractions) return;
        this.setModel.unhighlight(d);
      })
      .each(function(data) {
        const view = d3.select(this);
        if (!data.folder) {
          view.on("contextmenu", (event, d) => {
            event.preventDefault();
            _this._bindContextDialogItems(d);
            _this.DOM.contextDialog.classed("vzb-hidden", false);
            const itemNode = event.target.parentNode;
            const contentNode = _this.parent.DOM.content.node();
        
            //calculate offset to position the floating dialog
            const itemNodeBBInfo = itemNode.getBoundingClientRect();
            const contentNodeBBInfo = contentNode.getBoundingClientRect();
            const offset = itemNodeBBInfo.top - contentNodeBBInfo.top + contentNode.scrollTop + itemNodeBBInfo.height * 0.6;
            _this.DOM.contextDialog.style("top", offset + "px");
          });
        }
        if (colorFields && colorFields.includes(data.prop)) {
          view.append("span")
            .attr("class", "vzb-color")
            .style("background-color", d => {
              const color = _this.colorScale(d[colorConcept] || d[KEY]);
              return color;
            });
        }
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

    listItem.filter(d => d.folder).append("span").attr("class", "vzb-folder-mark")
      .on("click", function() {
        const view = d3.select(this.parentNode);
        const isOpened = view.classed("vzb-item-opened");
        if (isOpened) {
          view.classed("vzb-item-opened", false);
          view.selectAll(".vzb-item.vzb-item-folder").classed("vzb-item-opened", false);
        } else {
          view.classed("vzb-item-opened", true);
        }
      });

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
        d.children.sort(folderAndNameLocaleCompare);
        const view = d3.select(this);
        view.append("div")
          .attr("class", "vzb-item-children")
          .selectAll("div")
          .data(d.children, d => d[KEY] )
          .join("div")
          .attr("class", d => `vzb-item vzb-dialog-checkbox ${d.folder ? "vzb-item-folder" : ""}`)
          .call(_this._createListItem.bind(_this, dataLength, colorFields));
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
    const listItems = this.DOM.listItems;

    //OPTIMISATION!
    //when there is a log of marks, run this function only after dragging timeslider was released or playing was stopped
    const timeSlider = () => this.root.findChild({type: "TimeSlider"});
    if (listItems.data().length > 1000 && (this.MDL.frame.playing || timeSlider().ui.dragging)) return;
    //END OF OPTIMISATION

    listItems.data().forEach(d => {
      d.missingDataForFrame = !d.missingData && _getLeafChildren(d).every(child => !currentDataMap.hasByStr(child[KEY]));
    });

    const frame = this.localise(this.MDL.frame.value);
    const noDataSubstr = frame + ": " + this.localise("hints/nodata");
    listItems.select("input").property("disabled", d => d.missingData);
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
    this.DOM.listItems.select("input")
      .property("checked", function(d) {
        const isSelected = selected.has(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });

    this.DOM.listItems.filter(".vzb-item-folder").each(function(d) {
      const folderItemElement = d3.select(this);
      const checkedCount = folderItemElement.selectAll(".vzb-checked").size();
      const itemCount = _getLeafChildrenCount(d);
      folderItemElement.select("input")
        .property("checked", checkedCount)
        .property("indeterminate", checkedCount && checkedCount != itemCount);
    });

    sortItems(this.DOM.listItems.select(".vzb-item-children"));
    sortItems(this.DOM.list);
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

  get colorScale() {
    return this.MDL.color.scale.d3Scale;
  }

  get colorFields() {
    const colorConcept = this.MDL.color.data.concept;
    const colorConceptProps = this.MDL.color.data.conceptProps;
    const drilldownProps = this._getDrilldownProps();

    return ["entity_domain", "entity_set"].includes(colorConceptProps?.concept_type) && drilldownProps.includes(colorConcept) ? drilldownProps.slice(drilldownProps.indexOf(colorConcept)): null;
  }

  hideColorListinColorDialog() {
    //add class to color dialog for hide colorlist
    this.parent.parent.element.select(".vzb-top-dialog[data-dlg='colors']").classed("vzb-hide-colorlist", !!this.colorFields);
  }

  _interact() {
    const _this = this;

    return {
      clickToAddAllinGroup(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;

        _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
      },
      clickToRemoveAllinGroup(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;

        _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
      },
      clickToRemoveAllinOtherGroups(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;

        _this.model.data.filter.config.dimensions[dim]["$or"].forEach(item => {
          item[prop] = {"$in": [d[KEY]]}
        })
        _this.parent.DOM.content.node().scrollTop = 0;
      },
      disableSelectHover(){
        if (_this.root.ui.dialogs?.markercontrols?.disableFindInteractions) return true;
      },
      disableAddAll(){
        if (_this.root.ui.dialogs?.markercontrols?.disableFindAddRemoveGroups) return true;
        return true;
        // const dim = _this.model.data.space[0];
        // const prop = dim;
        // return !_this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: _getLeafChildren(d).map(m => m[KEY]), dim, prop});
      },
      disableRemoveAll(d){
        if (_this.root.ui.dialogs?.markercontrols?.disableFindAddRemoveGroups) return true;
        const dim = _this.model.data.space[0];
        const prop = dim;
        return _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: _getLeafChildren(d).map(m => m[KEY]), dim, prop});
      },
      disableRemoveAllinOtherGroups(){
        if (_this.root.ui.dialogs?.markercontrols?.disableFindAddRemoveGroups) return true;
        return false;
        // const dim = _this.model.data.space[0];
        // const prop = dim;
        // const everythingElse = _this.model.dataArray.map(m => m[KEY]).filter(f => f !== d[KEY]);
        // return _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: d[KEY], dim, prop}) 
        //   //everything else is already removed
        //   || everythingElse.every(key => _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key, dim, prop}) );
      },
      clickToSelect(d) {
        _this.setModel.select(d);
      },
      disableExplode(d) {
        const drilldownProps = _this._getDrilldownProps();
        const index = drilldownProps.indexOf(d.prop);
        return drilldownProps[index + 1] ? false : true;
      },
      disableFold(d) {
        const drilldownProps = _this._getDrilldownProps();
        const index = drilldownProps.indexOf(d.prop);
        return drilldownProps[index - 1] ? false : true;
      },
      clickToExplode(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const explodeProp = drilldownProps[drilldownProps.indexOf(prop) + 1];

        runInAction(() => {
          _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
          _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop, key: d[KEY]});
        })
      },
      clickToFold(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const foldProp = drilldownProps[drilldownProps.indexOf(prop) - 1];
        const foldValue = d[foldProp];
        
        runInAction(() => {
          _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: foldProp, key: foldValue});
          _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
        })
      }
    };
  }

  _initSelectDialog() {
    //this.DOM.moreOptionsHint = this.DOM.wrapper.select(".vzb-find-more-hint");

    this.DOM.selectDialog.on("mouseleave", () => {
      this._closeSelectDialog();
    });
    
    this.DOM.selectDialogTitle = this.DOM.selectDialog.select(".vzb-find-select-dialog-title");

    this.DOM.selectDialogClose = this.DOM.selectDialog.select(".vzb-find-select-dialog-close");
    this.DOM.selectDialogClose
      .html(iconClose)
      .on("click", () => this._closeSelectDialog());

    this.DOM.selectAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-find-select-dialog-item vzb-clickable");

    this.DOM.addAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-find-select-dialog-item vzb-clickable");  

    this.DOM.removeAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-find-select-dialog-item vzb-clickable");  

    this.DOM.removeAllinOtherGroups = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-find-select-dialog-item vzb-clickable");  

    this.DOM.editColorButton = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-find-select-dialog-item vzb-find-select-dialog-item-moreoptions");
    this.DOM.editColorButton.append("label")
      .attr("class", "vzb-clickable")
      .attr("for", "vzb-find-select-dialog-color-" + this.id);
    this.DOM.editColorButton.append("input")
      .attr("type", "color")
      .attr("class", "vzb-invisible")
      .attr("id", "vzb-find-select-dialog-color-" + this.id);
    this.DOM.editColorButton.append("span")
      .attr("class", "vzb-clickable");

    this.DOM.editColorButtonTooltip = this.DOM.editColorButton.append("div")
      .attr("class", "vzb-find-select-dialog-item-tooltip");
  }

  _updateUiStrings(name) {
    const t = this.localise;
    this.DOM.selectDialogTitle.text(name);
    //this.DOM.moreOptionsHint.text(t("hints/color/more"));
    this.DOM.selectAllinGroup.text("✅ " + t("dialogs/color/select-all-in-group") + " " + name);
    this.DOM.addAllinGroup.text("✳️ " + t("dialogs/color/add-all-in-group") + " " + name);
    this.DOM.removeAllinGroup.text("🗑️ " + t("dialogs/color/remove-all-in-group") + " " + name);
    this.DOM.removeAllinOtherGroups.text("🎯 " + t("dialogs/color/remove-else") + " " + name);
    this.DOM.editColorButton.select("label").text("🎨 " + t("dialogs/color/edit-color"));
    this.DOM.editColorButton.select("span").text(t("buttons/reset"));
    this.DOM.editColorButtonTooltip.text(t("dialogs/color/edit-color-blocked-hint") 
      + " " + (this.MDL.color.data.conceptProps?.name || this.MDL.color.data.concept)
    );
  }

  _closeSelectDialog() {
    this._selectDialogDatum && this.setModel.unhighlight(this._selectDialogDatum);
    this._selectDialogDatum = null;
    this.DOM.selectDialog.classed("vzb-hidden", true);
  }

  _bindSelectDialogItems(d) {
    //const _this = this;
    this._selectDialogDatum = d;
    this._updateUiStrings(d.name);

    this.DOM.selectAllinGroup
      //experimentally removed this limitation, because discovered that the "string" concept property works too
      //this is especially useful for CSV-only data because there are no entity props linking to other entities, just strings
      .classed("vzb-hidden", () => this._interact().disableSelectHover(d))
      .on("click", () => {
        this._interact().clickToSelect(d);
        this._closeSelectDialog();
      });

    this.DOM.addAllinGroup
      .classed("vzb-hidden", () => this._interact().disableAddAll(d))
      .on("click", () => {
        this._interact().clickToAddAllinGroup(d);
        this._closeSelectDialog();
      });
    this.DOM.removeAllinGroup
      .classed("vzb-hidden", () => this._interact().disableRemoveAll(d))
      .on("click", () => {
        this._interact().clickToRemoveAllinGroup(d);
        this._closeSelectDialog();
      });
    this.DOM.removeAllinOtherGroups
      .classed("vzb-hidden", () => this._interact().disableRemoveAllinOtherGroups(d))
      .on("click", () => {
        this._interact().clickToRemoveAllinOtherGroups(d);
        this._closeSelectDialog();
      });

    this.DOM.editColorButtonTooltip.classed("vzb-hidden", true);
    this.DOM.editColorButton.classed("vzb-hidden", true);

    // const isColorSelectable = this.MDL.color.scale.palette.isUserSelectable;
    // this.DOM.editColorButtonTooltip.classed("vzb-hidden", isColorSelectable);
    // this.DOM.editColorButton.select("span").classed("vzb-hidden", !isColorSelectable);
    // this.DOM.editColorButton.classed("vzb-find-select-dialog-item-disabled", !isColorSelectable);
    
    // if (isColorSelectable){
    //   const colorScaleModel = this.MDL.color.scale;
    //   const concept = this.MDL.color.data.concept;
    //   const target = this.MDL.color.data.isConstant ? "_default" : d[concept];
    //   const colorOld = colorScaleModel.palette.getColor(target);
    //   const colorDef = colorScaleModel.palette.getColor(target, colorScaleModel.palette.defaultPalette);
    //   this.DOM.editColorButton.select("input")
    //     .property("value", colorOld)
    //     .on("input", function(){
    //       const value = d3.select(this).property("value");
    //       colorScaleModel.palette.setColor(value, target);
    //     })
    //     .on("change", function(){
    //       _this._closeSelectDialog();
    //     });

    //   //reset color
    //   this.DOM.editColorButton.select("span")
    //     .classed("vzb-hidden", colorOld == colorDef)
    //     .style("color", colorDef)
    //     .on("click", function(){
    //       colorScaleModel.palette.removeColor(target);
    //       _this._closeSelectDialog();
    //     });
    // }
  }

  _initContextDialog() {
    this.DOM.contextDialog.on("mouseleave", () => {
      this._closeContextDialog();
    });
    
    this.DOM.contextDialogTitle = this.DOM.contextDialog.select(".vzb-find-context-dialog-title");

    this.DOM.contextDialogClose = this.DOM.contextDialog.select(".vzb-find-context-dialog-close");
    this.DOM.contextDialogClose
      .html(iconClose)
      .on("click", () => this._closeContextDialog());

    this.DOM.fold = this.DOM.contextDialog.append("div")
      .attr("class", "vzb-find-context-dialog-item vzb-clickable");

    this.DOM.explode = this.DOM.contextDialog.append("div")
      .attr("class", "vzb-find-context-dialog-item vzb-clickable");  
  }

  _updateContextDialogUiStrings(name, nameFold, nameExplode) {
    const t = this.localise;
    this.DOM.contextDialogTitle.text(name);
    this.DOM.fold.text("❇️ " + t("dialogs/find/fold") + " " + nameFold);
    this.DOM.explode.text("✳️ " + t("dialogs/find/explode") + " " + nameExplode);
  }

  _closeContextDialog() {
    this._contextDialogDatum && this.setModel.unhighlight(this._contextDialogDatum);
    this._contextDialogDatum = null;
    this.DOM.contextDialog.classed("vzb-hidden", true);
  }

  _bindContextDialogItems(d) {
    //const _this = this;
    this._contextDialogDatum = d;
    const drilldownProps = this._getDrilldownProps();
    const index = drilldownProps.indexOf(d.prop);
    const propNames = [drilldownProps[index - 1], drilldownProps[index + 1]].map(prop => prop ? this.model.data.source.getConcept(prop)?.name : null);
    
    this._updateContextDialogUiStrings(d.name, propNames[0], propNames[1]);

    this.DOM.fold
      .classed("vzb-hidden", () => this._interact().disableFold(d))
      .on("click", () => {
        this._interact().clickToFold(d);
        this._closeContextDialog();
      });

    this.DOM.explode
      .classed("vzb-hidden", () => this._interact().disableExplode(d))
      .on("click", () => {
        this._interact().clickToExplode(d);
        this._closeContextDialog();
      });

  }

}

const decorated = decorate(SectionFind, {
  "MDL": computed,
  "entitiesWithMissingDataInAllFrames": observable,
  "listReady": observable,
  "drilldownValues": observable.struct,
  "listData": observable.struct,
  "colorScale": computed,
  "colorFields": computed,
});

export {decorated as SectionFind};