import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { SectionFind } from "./section-find.js";
import { SectionAdd } from "./section-add.js";
import { SectionRemove } from "./section-remove.js";
import {runInAction, decorate, computed} from "mobx";
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
    this.DOM.sectionFind = this.element.select(".vzb-find");

    this.getSearchText = () => this.DOM.input_search.node().value;
    this.clearSearchText = () => {this.DOM.input_search.node().value = ""};


    this.DOM.input_search.on("keyup", event => {
      if (event.keyCode == 13 && this.getSearchText() == "select all") {
        this.clearSearchText();

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

    // const closeButton = this.DOM.buttons.select(".vzb-dialog-button[data-click='closeDialog']");
    // closeButton.on("click.panel", () => this.panelComps[this._getPanelMode()]._closeClick());

    // this.panelComps = { find: this, show: this.findChild({ type: "Show" }) };
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


    this.DOM.input_search.attr("placeholder", this.localise("placeholder/search") + "...");

    this.addReaction(this.showHideButtons);
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

const decorated = decorate(MarkerControls, {
  "MDL": computed
});

Dialog.add("markercontrols", decorated);
export { decorated as MarkerControls};
