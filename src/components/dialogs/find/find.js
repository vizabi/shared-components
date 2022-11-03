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

          <span class="vzb-spaceconfig-button"></span>
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
    this.DOM.markerSpaceButton = this.element.select(".vzb-spaceconfig-button");
    this.DOM.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");

    this.DOM.titleSwitchInput.on("change", () => {
      this.ui.panelMode = this.DOM.titleSwitchInput.property("checked") ? "show" : "find";
    }).property("checked", this._getPanelMode() !== "find");

    this.DOM.input_search.on("keyup", event => {
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
      .on("submit", event => {
        event.preventDefault();
        return false;
      });

    this.DOM.deselect_all.on("click", () => {
      this.MDL.selected.data.filter.clear();
    });

    const closeButton = this.DOM.buttons.select(".vzb-dialog-button[data-click='closeDialog']");
    closeButton.on("click.panel", () => this.panelComps[this._getPanelMode()]._closeClick());

    this.panelComps = { find: this, show: this.findChild({ type: "Show" }) };
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  draw() {
    super.draw();

    this.TIMEDIM = this.MDL.frame.data.concept;
    this.KEY = Symbol.for("key");
    this.KEYS = this.model.data.space.filter(dim => dim !== this.TIMEDIM);

    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");

    this.addReaction(this._enablePanelModeSwitch);
    this.addReaction(this._enableMarkerSpaceOptions);
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

  _enableMarkerSpaceOptions() {
    this.DOM.markerSpaceButton.classed("vzb-hidden", !this.ui.enableMarkerSpaceOptions);
  }

  _buttonAdjust() {
    this.DOM.buttons.selectAll(".vzb-dialog-buttons > :not([data-dialogtype])").classed("vzb-hidden", true);
    this.DOM.buttons.selectAll(`[data-panel=${this._getPanelMode()}]`).classed("vzb-hidden", false);
  }

  _processFramesData() {
    const KEY = this.KEY;
    const data = new Map();
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      if (!data.has(key)) data.set(key, { 
        [KEY]: key, 
        name: this._getCompoundLabelText(valuesObj)
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
      .on("change", (event, d) => {
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
        .filter(entry => entry[0] != this.MDL.frame.data.concept)
        .map(entry => utils.isNumber(entry[1]) ? (entry[0] + ": " + entry[1]) : entry[1])
        .join(", ");
    }
    if (d.label != null) return "" + d.label;
    return d[Symbol.for("key")];
  }

  _updateBrokenData() {
    const currentDataMap = this.model.dataMap;
    const findListItems = this.DOM.findListItems;
    const KEY = this.KEY;

    findListItems.data().forEach(d => {
      d.brokenData = !currentDataMap.hasByStr(d[KEY]);
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
      });
    }
  }

  _closeClick() {}
}

Find.DEFAULT_UI = {
  enableSelectShowSwitch: false,
  enableMarkerSpaceOptions: false,
  panelMode: "find",
  enablePicker: false
};

const decorated = decorate(Find, {
  "MDL": computed
});

Dialog.add("find", decorated);
export { decorated as Find};
