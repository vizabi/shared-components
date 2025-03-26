import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import {decorate, computed} from "mobx";
import "./datawarning.scss";

import { ICON_WARN, ICON_CLOSE } from "../../icons/iconset.js";

const PROFILE_CONSTANTS = () => ({
  SMALL: {
    infoElHeight: 16
  },
  MEDIUM: {
    infoElHeight: 20,
  },
  LARGE: {
    infoElHeight: 22
  }
});

const PROFILE_CONSTANTS_FOR_PROJECTOR = () => ({
  MEDIUM: {
    infoElHeight: 26
  },
  LARGE: {
    infoElHeight: 32
  }
});


let hidden = true;
class _DataWarning extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-data-warning-background"></div>
      <div class="vzb-data-warning-box">
        <div class="vzb-data-warning-link"></div>
        <div class="vzb-data-warning-title"></div>
        <div class="vzb-data-warning-body vzb-dialog-scrollable"></div>
      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {
      background: this.element.select(".vzb-data-warning-background"),
      container: this.element.select(".vzb-data-warning-box"),
      icon: this.element.select(".vzb-data-warning-link"),
      close: this.element.select(".vzb-data-warning-close"),
      title: this.element.select(".vzb-data-warning-title"),
      body: this.element.select(".vzb-data-warning-body"),
      button: this.root.element.select(this.options.appendButtonHere)
        .append("div").attr("class", "vzb-datawarning-button vzb-noexport")
    };
    
    this.element.classed("vzb-hidden", true);

    this.setupDialog();
    this.setupTiggerButton();
  }

  setupDialog() {
    this.DOM.background
      .on("click", () => {
        this.toggle(true);
      });

    this.DOM.container.append("div")
      .html(ICON_CLOSE)
      .on("click", () => {
        this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", "vzb-data-warning-close");

    this.DOM.icon.html(ICON_WARN)
      .append("div");
  }

  setupTiggerButton() {
    if(!this.DOM.button.size()) return utils.warn("quit setupTiggerButton of DataWarning because no button provided");
    
    utils.setIcon(this.DOM.button, ICON_WARN)
      .append("span")
      .on("click", () => {
        this.toggle();
      })
      .on("mouseover", () => {
        this.updateButtonOpacity(1);
      })
      .on("mouseout", () => {
        this.updateButtonOpacity();
      });
  }

  get MDL(){
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected
    };
  }

  draw() {
    this.localise = this.services.locale.auto();

    if (this._updateLayoutProfile()) return; //return if exists with error

    this.addReaction(this.updateUIstrings);
    this.addReaction(this.updateButtonOpacityScale);
    this.addReaction(this.updateButtonOpacity);
    this.addReaction(this.updateButtonPosition);
  }

  _updateLayoutProfile(){
    const size = this.services.layout.size;

    this.height = size.height;
    this.width = size.width;
    
    this.profileConstants = this.services.layout.getProfileConstants(
      PROFILE_CONSTANTS(this.width, this.height), 
      PROFILE_CONSTANTS_FOR_PROJECTOR(this.width, this.height)
    );

    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  updateUIstrings(){
    if (this.DOM.button) this.DOM.button.select("span")
      .text(this.localise("hints/dataWarning"));

    this.DOM.icon.select("div")
      .text(this.localise("hints/dataWarning"));

    const title = this.localise("datawarning/title/" + this.root.name);
    this.DOM.title.html(title)
      .classed("vzb-hidden", !title || title == ("datawarning/title/" + this.root.name));

    this.DOM.body.html(this.localise("datawarning/body/" + this.root.name));
  }

  toggle(arg) {
    hidden = arg ?? !hidden;
    this.element.classed("vzb-hidden", hidden);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", c != this && !hidden);
    });
  }

  updateButtonOpacityScale() {
    this.wScale = this.MDL.frame.scale.d3Scale.copy()
      .domain(this.ui?.doubtDomain.map(m => this.MDL.frame.parseValue("" + m)))
      .range(this.ui?.doubtRange)
      .clamp(true);
  }

  updateButtonOpacity(opacity) {
    if(!this.DOM.button.size()) return utils.warn("quit updateButtonOpacity of DataWarning because no button provided");

    if (opacity == null) opacity = this.wScale(this.MDL.frame.value);
    if (this.MDL.selected.data.filter.any()) opacity = 1;
    this.DOM.button.style("opacity", this.ui?.enable === false ? 0 : opacity);
  }

  updateButtonPosition() {
    this.services.layout.size;
    
    if(!this.DOM.button.size()) return utils.warn("quit updateButtonPosition of DataWarning because no button provided");
    if(this.ui?.enable === false) return;
    
    const {infoElHeight} = this.profileConstants;
    const vertical = this.ui.vertical;
    const horizontal = this.ui.horizontal; 
    const margin = this.ui.margin[this.services.layout.profile] || {};

    // position the warning icon
    this.DOM.button.select("svg")
      .attr("width", infoElHeight * 0.75)
      .attr("height", infoElHeight * 0.75);

    // position the whole group
    this.DOM.button
      .style("left", horizontal === "left" ? margin.left + "px" : null)
      .style("right", horizontal === "right" ? margin.right + "px" : null)
      .style("top", vertical === "top" ? margin.top + "px" : null)
      .style("bottom", vertical === "bottom" ? margin.bottom + "px": null);
  }
}

_DataWarning.DEFAULT_UI = {
  enable: false,
  doubtDomain: [],
  doubtRange: [],
  vertical: "bottom",
  horizontal: "right",
  margin: {
    LARGE: { top: 20, right: 20, left: 20, bottom: 20 },
    MEDIUM: { top: 20, right: 20, left: 20, bottom: 20 },
    SMALL: { top: 20, right: 20, left: 20, bottom: 20 }
  }
};

//export default BubbleChart;
export const DataWarning = decorate(_DataWarning, {
  "MDL": computed
});