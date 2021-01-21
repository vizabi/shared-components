import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";
import { Show } from "./show";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { runInAction } from "mobx";
import {decorate, computed} from "mobx";
/*!
 * VIZABI FIND CONTROL
 * Reusable find dialog
 */

class Find extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="find" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="find" data-click="dragDialog"></span>
        <div class="vzb-dialog-title">
          <label class="vzb-dialog-title-switch">
            <input type="checkbox">
            <span class="vzb-switch-slider round"></span>
            <span class="vzb-switch-off">
              <span data-localise="dialogs/find"></span>
            </span>
            <span class="vzb-switch-on">
              <span data-localise="buttons/show"></span>
            </span>
          </label>

          <span class="vzb-dialog-content vzb-find-filter">
            <form novalidate>
              <input class="vzb-find-search" type="search" required/>
              <button class="vzb-cancel-button" type="reset"></button>
            </form>
          </span>

          <span class="vzb-find-filter-selector"></span>
        </div>

        <div class="vzb-dialog-content vzb-dialog-content-fixed vzb-dialog-scrollable">
          <div class="vzb-dialog-content vzb-dialog-scrollable vzb-dialog-panel vzb-dialog-panel-find vzb-active">
            <div class="vzb-find-list">
              <!-- list will be placed here -->
            </div>
          </div>

          <div class="vzb-dialog-content vzb-dialog-scrollable vzb-dialog-panel vzb-dialog-panel-show">
          </div>
        </div>

        <div class="vzb-dialog-buttons">
          <div class="vzb-dialog-bubbleopacity vzb-dialog-control" data-panel="find"></div>
          <div class="vzb-dialog-button vzb-find-deselect" data-panel="find">
            <span data-localise="buttons/deselect"></span>
          </div>
          <div class="vzb-dialog-button vzb-show-deselect" data-panel="show">
            <span data-localise="buttons/reset"></span>
          </div>
          <div class="vzb-dialog-button vzb-show-apply" data-panel="show">
            <span data-localise="buttons/apply"></span>
          </div>

          <div data-dialogtype="find" data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>  

      </div>      
    `;

    config.subcomponents = [{
      type: Show,
      placeholder: ".vzb-dialog-panel-show"
    }, {
      type: SingleHandleSlider,
      placeholder: ".vzb-dialog-bubbleopacity",
      options: {
        value: "opacitySelectDim",
        submodel: "root.ui.chart"
      }
    }];

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM.findList = this.element.select(".vzb-find-list");
    this.DOM.titleSwitch = this.element.select(".vzb-dialog-title-switch");
    this.DOM.titleSwitchSlider = this.DOM.titleSwitch.select(".vzb-switch-slider");
    this.DOM.titleSwitchInput = this.DOM.titleSwitch.select("input");
    this.DOM.panels = this.DOM.content.selectAll(".vzb-dialog-content");
    this.DOM.panelFind = this.DOM.content.select(".vzb-dialog-panel-find");
    this.DOM.input_search = this.element.select(".vzb-find-search");
    this.DOM.deselect_all = this.element.select(".vzb-find-deselect");
    this.DOM.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");

    this.DOM.titleSwitchInput.on("change", () => {
      this.ui.panelMode = this.DOM.titleSwitchInput.property("checked") ? "show" : "find";
    }).property("checked", this._getPanelMode() !== "find");

    this.DOM.input_search.on("keyup", () => {
      const event = d3.event;
      if (event.keyCode == 13 && this.DOM.input_search.node().value == "select all") {
        this.DOM.input_search.node().value = "";

        //TODO: select all markers

        // //clear highlight so it doesn't get in the way when selecting an entity        
        // if (!utils.isTouchDevice()) _this.model.state.marker.clearHighlighted();
        // _this.model.state.marker.selectAll();
        // utils.defer(() => _this.panelComps[_this.getPanelMode()].showHideSearch());
      }
    });

    this.DOM.input_search.on("input", () => {
      this.panelComps[this._getPanelMode()]._showHideSearch();
    });

    d3.select(this.DOM.input_search.node().parentNode)
      .on("reset", () => {
        utils.defer(() => this.panelComps[this._getPanelMode()]._showHideSearch());
      })
      .on("submit", () => {
        d3.event.preventDefault();
        return false;
      });

    this.DOM.deselect_all.on("click", () => {
      this._deselectMarkers();
    });






    this.panelComps = { find: this, show: this.findChild({ type: "Show" }) };
  }

  get MDL() {
    return {
      frame: this.model.encoding.get("frame"),
      selected: this.model.encoding.get("selected"),
      highlighted: this.model.encoding.get("highlighted")
    };
  }

  draw() {
    super.draw();

    this.TIMEDIM = this.MDL.frame.data.concept;
    this.KEY = Symbol.for("key");
    this.KEYS = this.model.data.space.filter(dim => dim !== this.TIMEDIM);

    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");

    this.addReaction(this._enablePanelModeSwitch);
    this.addReaction(this._changePanelMode);
    this.addReaction(this._createFindList);
    this.addReaction(this._updateBrokenData);
    this.addReaction(this._selectDataPoints);
  }

  _changePanelMode() {
    const panelMode = this._getPanelMode();
    this.DOM.panels.classed("vzb-active", false);
    this.DOM.content.select(".vzb-dialog-panel-" + panelMode).classed("vzb-active", true);
    this.panelComps[panelMode]._showHideSearch();
    this._buttonAdjust();
    this.panelComps[panelMode]._showHideButtons();
  }

  _getPanelMode() {
    return this.ui.panelMode;
  }

  _enablePanelModeSwitch() {
    this.DOM.titleSwitchSlider.classed("vzb-hidden", !this.ui.enableSelectShowSwitch);
    this.DOM.titleSwitch.style("pointer-events", this.ui.enableSelectShowSwitch ? "auto" : "none");
  }

  _buttonAdjust() {
    this.DOM.buttons.selectAll(".vzb-dialog-buttons > :not([data-dialogtype])").classed("vzb-hidden", true);
    this.DOM.buttons.selectAll(`[data-panel=${this._getPanelMode()}]`).classed("vzb-hidden", false);
  }

  _processFramesData() {
    const KEY = this.KEY;
    const KEYS = this.KEYS;
    const data = new Map();
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      //TODO: remove this when vizabi reactive can request un states https://github.com/vizabi/vizabi-reactive/issues/31;
      if (!data.has(key) && valuesObj.unstate !== false && valuesObj.unstate !== 0 && valuesObj.unstate !== "FALSE") 
        data.set(key, { 
          [KEY]: key, 
          name: this._getCompoundLabelText(valuesObj.label, KEYS)
        });
    }));
    return data;
  }

  _createFindList() {
    const findList = this.DOM.findList;
    const KEY = this.KEY;

    const data = [...this._processFramesData().values()];

    //sort data alphabetically
    data.sort((a, b) => (a.name < b.name) ? -1 : 1);

    this.DOM.findListItems = findList.text("").selectAll("div")
      .data(data, function(d) { return d[KEY]; })
      .join("div")
        .attr("class", "vzb-find-item vzb-dialog-checkbox")
        .call(this._createListItem.bind(this));
  }

  _createListItem(listItem) {
    listItem.append("input")
      .attr("type", "checkbox")
      .attr("class", "vzb-find-item")
      .attr("id", (d, i) => "-find-" + i + "-" + this.id)
      .on("change", d => {
        //clear highlight so it doesn't get in the way when selecting an entity
        if (!utils.isTouchDevice()) this.MDL.highlighted.data.filter.delete(d);
        this.MDL.selected.data.filter.toggle(d);
        this.DOM.panelFind.node().scrollTop = 0;
        //return to highlighted state
        if (!utils.isTouchDevice() && !d.brokenData) this.MDL.highlighted.data.filter.set(d);
      });

    listItem.append("label")
      .attr("for", (d, i) => "-find-" + i + "-" + this.id)
      .text(d => d.name)
      .on("mouseover", d => {
        if (!utils.isTouchDevice() && !d.brokenData) this.MDL.highlighted.data.filter.set(d);
      })
      .on("mouseout", d => {
        if (!utils.isTouchDevice()) this.MDL.highlighted.data.filter.delete(d);
      });
  }

  _getCompoundLabelText(labelObj, keys) {
    return keys.map(key => labelObj[key]).join(",");
  }

  _updateBrokenData() {
    const currentDataMap = this.model.dataMap;
    const findListItems = this.DOM.findListItems;
    const KEY = this.KEY;

    findListItems.data().forEach(d => {
      d.brokenData = !currentDataMap.hasByObjOrStr(null, d[KEY]);
    });

    this._updateLabelTitle();
  }

  _updateLabelTitle() {
    const noDataSubstr = this.localise(this.MDL.frame.value) + ": " + this.localise("hints/nodata");
    this.DOM.findListItems.select("label")
      .classed("vzb-find-item-brokendata", d => d.brokenData)
      .attr("title", d => d.nameIfEllipsis + (d.brokenData ? (d.nameIfEllipsis ? " | " : "") + noDataSubstr : ""));
  }

  _updateView() {

  }

  _selectDataPoints() {
    const _this = this;
    const KEY = this.KEY;
    //    const selected = this.model.state.marker.getSelected(KEY);
    const selected = this.MDL.selected.data.filter;
    this.DOM.findListItems.order().select("input")
    //      .property("checked", d => (selected.indexOf(d[KEY]) !== -1));
      .property("checked", function(d) {
        const isSelected = selected.has(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });
    
    const checkedItems = this.DOM.findList.selectAll(".vzb-checked");
    checkedItems
      .lower()
      .classed("vzb-separator", (d, i) => !i);    
  }

  _showHideSearch() {
    if (this._getPanelMode() !== "find") return;

    let search = this.DOM.input_search.node().value || "";
    search = search.toLowerCase();

    this.DOM.findList.selectAll(".vzb-find-item")
      .classed("vzb-hidden", d => {
        const lower = (d.name || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });
  }

  _showHideButtons() {
    if (this._getPanelMode() !== "find") return;

    const someSelected = this.MDL.selected.data.filter.any();
    this.DOM.deselect_all.classed("vzb-hidden", !someSelected);
    this.DOM.opacity_nonselected.classed("vzb-hidden", !someSelected);
    if (someSelected) {
      runInAction(() => {
        const opacityNonSelectedSlider = this.findChild({ type: "SingleHandleSlider" });
        opacityNonSelectedSlider._updateSize();
        opacityNonSelectedSlider._updateView();
      })
    }
  }

  _deselectMarkers() {
    const selectedFilter = this.MDL.selected.data.filter;
    selectedFilter.delete([...selectedFilter.markers])
  }
}

Find.DEFAULT_UI = {
  enableSelectShowSwitch: false,
  panelMode: "find",
  enablePicker: false
};

const decorated = decorate(Find, {
  "MDL": computed
});

Dialog.add("find", decorated);
export { decorated as Find};



const _Find = {

  init(config, parent) {
    this.name = "find";
    const _this = this;

    this.components = [{
      component: show,
      placeholder: ".vzb-dialog-panel-show",
      model: ["state", "locale"]
    }, {
      component: singlehandleslider,
      placeholder: ".vzb-dialog-bubbleopacity",
      model: ["state.marker", "locale"],
      arg: "opacitySelectDim"
    }];

    this.enableSelectShowSwitch = ((config.ui.dialogs.dialog || {}).find || {}).enableSelectShowSwitch || false;
    this.panelMode = ((config.ui.dialogs.dialog || {}).find || {}).panelMode || "find";
    this.enablePicker = ((config.ui.dialogs.dialog || {}).find || {}).enablePicker;
    if (this.enablePicker) {
      this.components.push({
        component: indicatorpicker,
        placeholder: ".vzb-find-filter-selector",
        model: ["state.time", "state.marker", "locale"]
      });
    }

    this.model_binds = {
      "change:state.marker.select": function(evt, path) {
        if (path.indexOf("select.labelOffset") !== -1) return;

        _this.items.order();
        _this.selectDataPoints();
        _this.showHideButtons();
      },
      "change:state.time.playing": function(evt) {
        if (!_this.model.state.time.playing) {
          _this.time = _this.model.state.time.value;

          _this.model.state.marker.getFrame(_this.time, (values, time) => {
            if (!values || (_this.time - time)) return;
            _this.redrawDataPoints(values);
          });
        }
      },
      "change:state.time.value": function(evt) {
        // hide changes if the dialog is not visible
        if (!_this.placeholderEl.classed("vzb-active") && !_this.placeholderEl.classed("vzb-sidebar")) return;

        _this.time = _this.model.state.time.value;

        _this.model.state.marker.getFrame(_this.time, values => {
          if (!values) return;
          _this.redrawDataPoints(values);
        });
      },
      "change:ui.dialogs.dialog.find.enableSelectShowSwitch": function(evt) {
        if (!_this._readyOnce) return;
        _this.enableSelectShowSwitch = ((config.ui.dialogs.dialog || {}).find || {}).enableSelectShowSwitch || false;
        _this.element.select(".vzb-dialog-title-switch .vzb-switch-slider").classed("vzb-hidden", !_this.enableSelectShowSwitch);
        _this.element.select(".vzb-dialog-title-switch").style("pointer-events", _this.enableSelectShowSwitch ? "auto" : "none");
      },
      "translate:locale": function() {
        if (!_this._readyOnce) return;
        _this.input_search.attr("placeholder", _this.translator("placeholder/search") + "...");
      }
    };

    this._super(config, parent);
  },

  /**
   * Grab the list div
   */
  readyOnce() {
    this._super();

    this.panelComps = { find: this, show: this.findChildByName("show") };

    this.titleSwitch = this.element.select(".vzb-dialog-title-switch input");
    this.panelsEl = this.contentEl.selectAll(".vzb-dialog-content");
    this.list = this.element.select(".vzb-find-list");
    this.input_search = this.element.select(".vzb-find-search");
    this.deselect_all = this.element.select(".vzb-find-deselect");
    this.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");

    this.element.select(".vzb-dialog-title-switch .vzb-switch-slider").classed("vzb-hidden", !this.enableSelectShowSwitch);
    this.element.select(".vzb-dialog-title-switch").style("pointer-events", this.enableSelectShowSwitch ? "auto" : "none");
    this.element.select(".vzb-find-filter-selector").classed("vzb-hidden", !this.enablePicker);
    this.element.select(".vzb-dialog-title").classed("vzb-title-two-rows", this.enablePicker);

    this.KEY = this.model.state.entities.getDimension();

    const _this = this;

    this.titleSwitch.on("change", () => {
      _this.panelMode = _this.titleSwitch.property("checked") ? "show" : "find";
      _this.panelsEl.classed("vzb-active", false);
      _this.contentEl.select(".vzb-dialog-panel-" + _this.panelMode).classed("vzb-active", true);
      _this.panelComps[_this.panelMode].showHideSearch();
      _this._buttonAdjust();
      _this.panelComps[_this.panelMode].showHideButtons();
    });
    this.titleSwitch.property("checked", this.panelMode !== "find");
    this.titleSwitch.dispatch("change");

    this.input_search.on("keyup", () => {
      const event = d3.event;
      if (event.keyCode == 13 && _this.input_search.node().value == "select all") {
        _this.input_search.node().value = "";
        //clear highlight so it doesn't get in the way when selecting an entity
        if (!utils.isTouchDevice()) _this.model.state.marker.clearHighlighted();
        _this.model.state.marker.selectAll();
        utils.defer(() => _this.panelComps[_this.panelMode].showHideSearch());
      }
    });

    this.input_search.on("input", () => {
      _this.panelComps[_this.panelMode].showHideSearch();
    });

    d3.select(this.input_search.node().parentNode)
      .on("reset", () => {
        utils.defer(() => _this.panelComps[_this.panelMode].showHideSearch());
      })
      .on("submit", () => {
        d3.event.preventDefault();
        return false;
      });

    this.deselect_all.on("click", () => {
      _this.deselectMarkers();
    });

    const closeButton = this.buttonsEl.select(".vzb-dialog-button[data-click='closeDialog']");
    closeButton.on("click.panel", () => _this.panelComps[_this.panelMode].closeClick());

    this.translator = this.model.locale.getTFunction();
    this.input_search.attr("placeholder", this.translator("placeholder/search") + "...");

    //make sure it refreshes when all is reloaded
    this.root.on("ready", () => {
      _this.ready();
    });

  },

  getPanelMode() {
    return this.panelMode;
  },

  _buttonAdjust() {
    this.buttonsEl.selectAll(".vzb-dialog-buttons > :not([data-dialogtype])").classed("vzb-hidden", true);
    this.buttonsEl.selectAll(`[data-panel=${this.panelMode}]`).classed("vzb-hidden", false);
  },

  open() {
    const _this = this;
    this._super();

    this.input_search.node().value = "";
    this.showHideSearch();

    this.time = this.model.state.time.value;

    this.model.state.marker.getFrame(this.time, values => {
      if (!values) return;
      _this.redrawDataPoints(values);
    });
  },

  /**
   * Build the list everytime it updates
   */
  //TODO: split update in render and update methods
  ready() {
    this._super();

    const _this = this;
    const KEYS = this.KEYS = utils.unique(this.model.state.marker._getAllDimensions({ exceptType: "time" }));

    this.importantHooks = _this.model.state.marker.getImportantHooks();

    this.time = this.model.state.time.value;
    this.model.state.marker.getFrame(this.time, values => {
      if (!values) return;

      const data = _this.model.state.marker.getKeys().map(d => {
        d.brokenData = false;
        d.name = _this.model.state.marker.getCompoundLabelText(d, values);
        return d;
      });

      //sort data alphabetically
      data.sort((a, b) => (a.name < b.name) ? -1 : 1);

      _this.list.html("");

      _this.items = _this.list.selectAll(".vzb-find-item")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "vzb-find-item vzb-dialog-checkbox");

      _this.items.append("input")
        .attr("type", "checkbox")
        .attr("class", "vzb-find-item")
        .attr("id", (d, i) => "-find-" + i + "-" + _this._id)
        .on("change", d => {
          //clear highlight so it doesn't get in the way when selecting an entity
          if (!utils.isTouchDevice()) _this.model.state.marker.clearHighlighted();
          _this.model.state.marker.selectMarker(d);
          //return to highlighted state
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.state.marker.highlightMarker(d);
        });

      _this.items.append("label")
        .attr("for", (d, i) => "-find-" + i + "-" + _this._id)
        .text(d => d.name)
        .on("mouseover", d => {
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.state.marker.highlightMarker(d);
        })
        .on("mouseout", d => {
          if (!utils.isTouchDevice()) _this.model.state.marker.clearHighlighted();
        });

      _this.items.each(function(d) {
        d.nameIfEllipsis = this.offsetWidth < this.scrollWidth ? d.name : "";
      });

      utils.preventAncestorScrolling(_this.element.select(".vzb-dialog-scrollable"));

      _this.redrawDataPoints(values);
      _this.selectDataPoints();
      _this.showHideSearch();
      _this.showHideButtons();

    });
  },

  redrawDataPoints(values) {
    const _this = this;
    const KEYS = this.KEYS;

    const nonConstantHooks = _this.importantHooks.filter(name => _this.model.state.marker[name].use !== "constant");
    
    utils.forEach(_this.items.data(), d => {
      //const view = d3.select(this).select("label");
      d.brokenData = false;

      utils.forEach(nonConstantHooks, name => {
        const hook = values[name];
        if (!hook) return;
        const value = hook[utils.getKey(d, KEYS)];
        if (!value && value !== 0) {
          d.brokenData = true;
          return false;
        }
      });

    });
    const noDataSubstr = _this.model.state.time.formatDate(_this.time) + ": " + _this.translator("hints/nodata");
    _this.items.select("label")
      .classed("vzb-find-item-brokendata", d => d.brokenData)
      .attr("title", d => d.nameIfEllipsis + (d.brokenData ? (d.nameIfEllipsis ? " | " : "") + noDataSubstr : ""));
  },

  selectDataPoints() {
    const _this = this;
    const KEY = this.KEY;
    //    const selected = this.model.state.marker.getSelected(KEY);
    const selected = this.model.state.marker;
    this.items.selectAll("input")
    //      .property("checked", d => (selected.indexOf(d[KEY]) !== -1));
      .property("checked", function(d) {
        const isSelected = selected.isSelected(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });
    const lastCheckedNode = this.list.selectAll(".vzb-checked")
      .classed("vzb-separator", false)
      .lower()
      .nodes()[0];
    d3.select(lastCheckedNode).classed("vzb-separator", true);
    this.contentEl.node().scrollTop = 0;
  },

  showHideSearch() {
    if (this.getPanelMode() !== "find") return;

    let search = this.input_search.node().value || "";
    search = search.toLowerCase();

    this.list.selectAll(".vzb-find-item")
      .classed("vzb-hidden", d => {
        const lower = (d.name || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });
  },

  showHideButtons() {
    if (this.getPanelMode() !== "find") return;

    const someSelected = !!this.model.state.marker.select.length;
    this.deselect_all.classed("vzb-hidden", !someSelected);
    this.opacity_nonselected.classed("vzb-hidden", !someSelected);
    if (someSelected) {
      this.findChildByName("singlehandleslider").trigger("resize");
    }
  },

  deselectMarkers() {
    this.model.state.marker.clearSelected();
  },

  transitionEnd(event) {
    this._super(event);

    if (!utils.isTouchDevice()) this.input_search.node().focus();
  },

  closeClick() {

  }

}
