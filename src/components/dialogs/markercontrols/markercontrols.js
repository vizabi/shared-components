import * as utils from "../../../legacy/base/utils.js";
import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { SectionFind } from "./section-find.js";
import { SectionAdd } from "./section-add.js";
import { SectionRemove } from "./section-remove.js";
import { SectionSlice } from "./section-slice.js";
import {computed, decorate, runInAction} from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");

class _MarkerControls extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="markercontrols" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="markercontrols" data-click="dragDialog"></span>
        <div class="vzb-dialog-header">
          <span class="vzb-dialog-title"></span>

          <span class="vzb-dialog-content vzb-filter">
            <form novalidate>
              <input class="vzb-search" type="search" required/>
              <button class="vzb-cancel-button" type="reset"></button>
            </form>
          </span>

        </div>

        <div class="vzb-dialog-content vzb-dialog-content-fixed vzb-dialog-scrollable">
          <div class="vzb-dialog-content vzb-dialog-scrollable vzb-dialog-panel vzb-dialog-panel-markercontrols vzb-active">
            <div class="vzb-section vzb-find"></div>
            <div class="vzb-section vzb-add"></div>
            <div class="vzb-section vzb-remove"></div>
            <div class="vzb-section vzb-slice"></div>
          </div>
        </div>

        <div class="vzb-dialog-buttons">
          <div class="vzb-dialog-bubbleopacity vzb-dialog-control" data-panel="markercontrols"></div>
          <div class="vzb-dialog-button vzb-deselect" data-panel="markercontrols">
            <span data-localise="buttons/deselect"></span>
          </div>

          <div data-dialogtype="markercontrols" data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>  

      </div>      
    `;

    config.subcomponents = [{
      type: SingleHandleSlider,
      placeholder: ".vzb-dialog-bubbleopacity",
      options: {
        value: "opacitySelectDim",
        submodel: "root.ui.chart"
      }
    },{
      type: SectionFind,
      placeholder: ".vzb-find"
    },{
      type: SectionAdd,
      placeholder: ".vzb-add"
    },{
      type: SectionRemove,
      placeholder: ".vzb-remove"
    },{
      type: SectionSlice,
      placeholder: ".vzb-slice"
    }];

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM.input_search = this.element.select(".vzb-search");
    this.DOM.deselect_all = this.element.select(".vzb-deselect");
    this.DOM.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");
    this.DOM.title = this.element.select(".vzb-dialog-title");

    this.sections = this.children.filter(f => Object.getPrototypeOf(f.constructor).name === "MarkerControlsSection");
    this.magicCommands = this.sections.map(section => section.magicCommand);
    this._getSearchTerm = () => {
      const text = this.DOM.input_search.node().value.trim().toLowerCase();
      const command = this.magicCommands.find(f => text === f || text.indexOf(f + " ") === 0) || false;
      const arg = command ? text.replace(command, "").trim() : text;
      return {command, arg};
    }
    this._clearSearch = () => {this.DOM.input_search.node().value = "";};


    this.DOM.input_search
      .on("keyup", event => {
        if (event.keyCode == 13) {
          this.concludeSearch();
          this._clearSearch();
        }
      })
      .on("input", () => {
        this.updateSearch()
      });

    //is this needed?
    d3.select(this.DOM.input_search.node().parentNode)
      .on("reset", () => {
        this.updateSearch();
      })
      .on("submit", event => {
        event.preventDefault();
        return false;
      });

    this.DOM.deselect_all.on("click", this.MDL.selected.data.filter.clear);
  }

  draw() {
    super.draw();
    this.addReaction(this.showHideButtons);
    this.addReaction(this.updateSearch);
    this.addReaction(this.updateUIStrings);
  }
  
  updateUIStrings() {
    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");
    this.DOM.title.text(this.localise("marker-plural/" + this.model.id));
  }

  updateSearch({command, arg} = this._getSearchTerm()) {
    this.element.classed("vzb-clean-search", this.isCleanSearch()); 
    this.sections.forEach(section => {
      section.hide(command && section.magicCommand !== command || !command && !arg && section.magicCommand !== "find");
      section.updateSearch(arg);
    });
  }

  toggleFullscreenish(section) {
    const isFS = this.isFullscreenish();
    this.element.classed("vzb-fullscreenish", !isFS);
    this._clearSearch();
    this.updateSearch({command: section?.magicCommand});
  }

  isFullscreenish(){
    return this.element.classed("vzb-fullscreenish");
  }

  concludeSearch({command, arg} = this._getSearchTerm()) {
    this.sections.forEach(section => section.concludeSearch(arg));
  }

  isCleanSearch({command, arg} = this._getSearchTerm()){
    return !command && !arg;
  }


  showHideButtons() {
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

  _getCompoundLabelText(d) {
    if (typeof d.label == "object") {
      return Object.entries(d.label)
        .filter(entry => entry[0] != this.MDL.frame.data.concept)
        .map(entry => utils.isNumber(entry[1]) ? (entry[0] + ": " + entry[1]) : entry[1])
        .join(", ");
    }
    if (d.label != null) return "" + d.label;
    return d[KEY];
  }

  get markersData() {
    const data = new Map();
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      if (!data.has(key)) data.set(key, { 
        [KEY]: key, 
        name: this._getCompoundLabelText(valuesObj)
      });
    }));
    return data;
  }

}

_MarkerControls.DEFAULT_UI = {
  
};

const MarkerControls = decorate(_MarkerControls, {
  "markersData": computed
});


Dialog.add("markercontrols", MarkerControls);
export { MarkerControls };
