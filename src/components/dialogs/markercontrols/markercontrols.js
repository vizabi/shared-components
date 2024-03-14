import * as utils from "../../../legacy/base/utils.js";
import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { SectionFind } from "./section-find.js";
import { SectionAdd } from "./section-add.js";
import { SectionRemove } from "./section-remove.js";
import { SectionSwitch } from "./section-switch.js";
import { SectionSlice } from "./section-slice.js";
import {computed, decorate, runInAction} from "mobx";
import { ICON_QUESTION } from "../../../icons/iconset.js";
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

          <span class="vzb-info"></span>

        </div>

        <div class="vzb-dialog-content vzb-dialog-content-fixed vzb-dialog-scrollable">
          <div class="vzb-dialog-content vzb-dialog-scrollable vzb-dialog-panel vzb-dialog-panel-markercontrols vzb-active">
            <div class="vzb-section vzb-find"></div>
            <div class="vzb-section vzb-add"></div>
            <div class="vzb-section vzb-remove"></div>
            <div class="vzb-section vzb-switch"></div>
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

        <div class="vzb-info-popup vzb-hidden"></div>

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
    }];
    
    if (!config.default_ui.disableSwitch)
      config.subcomponents.push({
        type: SectionSwitch,
        placeholder: ".vzb-switch"
      });
      
    if (!config.default_ui.disableSlice)
      config.subcomponents.push({
        type: SectionSlice,
        placeholder: ".vzb-slice"
      });

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM.input_search = this.element.select(".vzb-search");
    this.DOM.searchForm = this.element.select("form");
    this.DOM.deselect_all = this.element.select(".vzb-deselect");
    this.DOM.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");
    this.DOM.title = this.element.select(".vzb-dialog-title");
    this.DOM.info = this.element.select(".vzb-info");
    this.DOM.infoPopup = this.element.select(".vzb-info-popup");

    this.sections = this.children.filter(f => Object.getPrototypeOf(f.constructor).name === "MarkerControlsSection");
    this.sectionFind = this.children.find(f => f.constructor.name === "SectionFind");
    this.magicCommands = this.sections.map(section => section.magicCommand);
    this._getSearchTerm = () => {
      const text = this.DOM.input_search.node().value.trim().toLowerCase();
      const command = this.magicCommands.find(f => text === f || text.indexOf(f + " ") === 0) || false;
      const arg = command ? text.replace(command, "").trim() : text;
      return {command, arg};
    };
    this._clearSearch = () => {this.DOM.input_search.node().value = "";};


    this.DOM.input_search
      .on("keyup", event => {
        if (event.keyCode == 13) {
          this.concludeSearch();
          this._clearSearch();
        }
      })
      .on("input", () => {
        this.updateSearch();
      });

    //is this needed?
    this.DOM.searchForm
      .on("reset", () => {
        this._clearSearch();
        this.updateSearch();
      })
      .on("submit", event => {
        event.preventDefault();
        return false;
      });


    utils.setIcon(this.DOM.info, ICON_QUESTION)
      .on("click", (event) => {
        this.toggleInfoPopup();
        event.stopPropagation();
      });

    this.DOM.infoPopup.on("click", () => {this.toggleInfoPopup(false);});

    this.DOM.dialog.on("click", () => {this.toggleInfoPopup(false);});
    
    this.DOM.deselect_all.on("click", () => this.MDL.selected.data.filter.clear());
  }

  draw() {
    super.draw();
    this.addReaction(this.showHideButtons);
    this.addReaction(this.updateSearch);
    this.addReaction(this.updateUIStrings);
  }
  
  updateUIStrings() {
    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");
    this.DOM.title.text(this.localise("marker-plural/" + this.model.id.replace("-splash", "")));
  }

  updateSearch({command, arg} = this._getSearchTerm()) {
    this.element.classed("vzb-clean-search", this.isCleanSearch()); 
    this.sections.forEach(section => {
      section.showHideSection( 0
        //when clean search, keep "find" 
        || !command && !arg && section.magicCommand === "find" 
        //when clean search, keep invitationally "add" when "find" has few items
        || !command && !arg && section.magicCommand === "add" && this.sectionFind.getListItemCount() < 10    
        // show a specific section when using a command
        || command && section.magicCommand === command 
        // show all sections when searcing a global argument
        || !command && arg
      );
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

  concludeSearch({arg} = this._getSearchTerm()) {
    this.sections.forEach(section => section.concludeSearch(arg));
  }

  isCleanSearch({command, arg} = this._getSearchTerm()){
    return !command && !arg;
  }

  toggleInfoPopup(showhide = this.DOM.infoPopup.classed("vzb-hidden")){
    
    this.DOM.infoPopup.classed("vzb-hidden", !showhide);
    if (!showhide) return;

    const globalExample = this.findChild({type: "SectionFind"}).example().toLowerCase().substr(0,5);
    const sectionFindRemoveExample = this.findChild({type: "SectionFind"}).example().toLowerCase().substr(0,7) + "...";
    const sectionAddExample = this.findChild({type: "SectionAdd"}).example().toLowerCase().substr(0,7) + "...";
    const sectionSwitchExample = this.findChild({type: "SectionSwitch"})?.example?.().toLowerCase();
    const sectionSliceExample = this.findChild({type: "SectionSlice"})?.example?.().toLowerCase();
    const infoHints = [
      {text: "Examples and tips", instruction: true},
      {text: "Search within all commands like so:", instruction: true},
      {action: globalExample, ellipsis: "..."},
      {text: "or use a specific command:", instruction: true},
      {icon: "👀", action: "find", example: sectionFindRemoveExample},
      {icon: "➕", action: "add", example: sectionAddExample},
      {icon: "❌", action: "remove", example: sectionFindRemoveExample},
      {icon: "➡️", action: "switch", example: sectionSwitchExample},
      {icon: "🧩", action: "slice", example: sectionSliceExample},
    ].filter(v => !v.icon || v.example);
    
    

    this.DOM.infoPopup.selectAll("div")
      .data(infoHints, (d, i) => i).join("div")
      .attr("class", d => d.instruction ? "vzb-instruction" : "vzb-clickable")
      .html(d => `
        <span class="vzb-icon">${d.icon||""}</span> 
        <span class="vzb-action">${d.action || d.text ||""}</span>
        <span class = "vzb-ellipsis">${d.ellipsis || ""}</span> 
        <span class="vzb-example">${d.example || ""}</span>`
      )
      .on("click", (e, d) => {
        if(!d.action) return;
        this.DOM.input_search.node().value = d.action + (d.example ? " " : "");
        this.toggleInfoPopup();
        this.updateSearch();
        this.DOM.input_search.node().focus();
      });

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
    const markerSpace = this.model.data.space;

    if (typeof d.label == "object") {
      return Object.entries(d.label)
        .filter(([k]) => k != this.MDL.frame.data.concept)
        //sort parts of the name along the marker space array, so we get geo, gender instead of gender, geo
        .sort(([a], [b]) => markerSpace.indexOf(a) - markerSpace.indexOf(b))
        //add keys where values are numbers, such as "age: 69"
        .map(([k, v]) => utils.isNumber(v) ? k + ": " + v : v)
        .join(", ");
    }
    if (d.label != null) return "" + d.label;
    return d[KEY];
  }

  get marksFromAllFrames() {
    const data = new Map();
    const space = this.model.data.space.filter(f => f !== this.model.encoding.frame.data.concept);
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      if (!data.has(key)) {
        const newItem = { 
          [KEY]: key,
          name: this._getCompoundLabelText(valuesObj),
          label: valuesObj.label || {}
        };
        space.forEach(dim => newItem[dim] = valuesObj[dim]);
        data.set(key, newItem);
      }
    }));
    return [...data.values()];
  }

  get dimMarkersData() {
    const data = new Map();
    const space = this.ui.primaryDim 
      ? [this.ui.primaryDim] 
      : this.model.data.space.filter(f => f !== this.model.encoding.frame.data.concept);
    space.forEach(dim => {
      this.marksFromAllFrames.forEach(valuesObj => {
        const key = "" + valuesObj[dim];
        if (!data.has(key)) {
          data.set(key, {
            [KEY]: key,
            name: valuesObj.label[dim],
            [dim]: valuesObj[dim],
            prop: dim,
            dim
          });
        }
      });
    });
    return data;
  }
}

_MarkerControls.DEFAULT_UI = {
  "disableSwitch": false,
  "disableSlice": false
};

const MarkerControls = decorate(_MarkerControls, {
  "marksFromAllFrames": computed,
  "dimMarkersData": computed
});


Dialog.add("markercontrols", MarkerControls);
export { MarkerControls };
