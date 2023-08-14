import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { SectionFind } from "./section-find.js";
import { SectionAdd } from "./section-add.js";
import { SectionRemove } from "./section-remove.js";
import {runInAction} from "mobx";
import * as d3 from "d3";

class MarkerControls extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="find" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="find" data-click="dragDialog"></span>
        <div class="vzb-dialog-title">
          <span data-localise="buttons/asfassf"></span>

          <span class="vzb-dialog-content vzb-find-filter">
            <form novalidate>
              <input class="vzb-find-search" type="search" required/>
              <button class="vzb-cancel-button" type="reset"></button>
            </form>
          </span>

        </div>

        <div class="vzb-dialog-content vzb-dialog-content-fixed vzb-dialog-scrollable">
          <div class="vzb-dialog-content vzb-dialog-scrollable vzb-dialog-panel vzb-dialog-panel-find vzb-active">
            <div class="vzb-section vzb-find"></div>
            <div class="vzb-section vzb-add"></div>
            <div class="vzb-section vzb-remove"></div>
          </div>
        </div>

        <div class="vzb-dialog-buttons">
          <div class="vzb-dialog-bubbleopacity vzb-dialog-control" data-panel="find"></div>
          <div class="vzb-dialog-button vzb-find-deselect" data-panel="find">
            <span data-localise="buttons/deselect"></span>
          </div>

          <div data-dialogtype="find" data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
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
    }];

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM.input_search = this.element.select(".vzb-find-search");
    this.DOM.deselect_all = this.element.select(".vzb-find-deselect");
    this.DOM.opacity_nonselected = this.element.select(".vzb-dialog-bubbleopacity");

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
    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");
    this.addReaction(this.showHideButtons);
    this.addReaction(this.updateSearch);
  }

  updateSearch({command, arg} = this._getSearchTerm()) {
    this.sections.forEach(section => {
      section.hide(command && section.magicCommand !== command);
      section.updateSearch(arg);
    });
  }

  concludeSearch({command, arg} = this._getSearchTerm()) {
    this.sections.forEach(section => section.concludeSearch(arg));
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
}

MarkerControls.DEFAULT_UI = {
  
};

Dialog.add("markercontrols", MarkerControls);
export { MarkerControls };
