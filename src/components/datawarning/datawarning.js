import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import {decorate, observable, computed, runInAction} from "mobx";
import "./datawarning.scss";

import { ICON_WARN, ICON_CLOSE } from "../../icons/iconset.js";

let hidden = true;
const HIDE_WHEN_SMALLER_THAN = 100; //px
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
      button: d3.select(this.options.button)
    };
    
    this.element.classed("vzb-hidden", true);

    this.setupDialog();
    this.setupTiggerButton();
    this.setOptions();
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

  setupTiggerButton(button = this.DOM.button) {
    if(!button) return utils.warn("quit setupTiggerButton of DataWarning because no button provided");
    
    utils.setIcon(button, ICON_WARN)
      .append("text")
      .attr("text-anchor", "end")
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

    this.addReaction(this.updateUIstrings);
    this.addReaction(this.updateButtonOpacityScale);
    this.addReaction(this.updateButtonOpacity);
    this.addReaction(this.updateButtonPosition);
  }

  updateUIstrings(){
    if (this.DOM.button) this.DOM.button.select("text")
      .text(this.localise("hints/dataWarning"));

    this.DOM.icon.select("div")
      .text(this.localise("hints/dataWarning"));

    const title = this.localise("datawarning/title/" + this.root.name);
    this.DOM.title.html(title)
      .classed("vzb-hidden", !title || title == ("datawarning/title/" + this.root.name));

    this.DOM.body.html(this.localise("datawarning/body/" + this.root.name));
  }

  toggle(arg) {
    if (arg == null) arg = !hidden;
    hidden = arg;
    this.element.classed("vzb-hidden", hidden);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", c != this && !hidden);
    });
  }

  updateButtonOpacityScale() {
    this.wScale = this.MDL.frame.scale.d3Scale.copy()
      .domain(this.ui.doubtDomain.map(m => this.MDL.frame.parseValue("" + m)))
      .range(this.ui.doubtRange)
      .clamp(true);
  }

  updateButtonOpacity(opacity) {
    if(!this.DOM.button) return utils.warn("quit updateButtonOpacity of DataWarning because no button provided");

    if (opacity == null) opacity = this.wScale(this.MDL.frame.value);
    if (this.MDL.selected.data.filter.any()) opacity = 1;
    this.DOM.button.style("opacity", opacity);
  }

  updateButtonPosition() {
    if(!this.DOM.button) return utils.warn("quit updateButtonPosition of DataWarning because no button provided");
    const {vertical, horizontal, width, height, wLimit} = this;
    const {top, bottom, left, right} = this;

    // reset font size to remove jumpy measurement
    const dataWarningText = this.DOM.button.select("text")
      .style("font-size", null);

    // reduce font size if the caption doesn't fit
    let warnBB = dataWarningText.node().getBBox();
    const dataWarningWidth = warnBB.width + warnBB.height * 3;
    if (wLimit > 0 && dataWarningWidth > wLimit) {
      const font = parseInt(dataWarningText.style("font-size")) * wLimit / dataWarningWidth;
      dataWarningText.style("font-size", font + "px");
    }

    // position the warning icon
    warnBB = dataWarningText.node().getBBox();
    this.DOM.button.select("svg")
      .attr("width", warnBB.height * 0.75)
      .attr("height", warnBB.height * 0.75)
      .attr("x", -warnBB.width - warnBB.height * 1.2)
      .attr("y", -warnBB.height * 0.65);

    // position the whole group
    warnBB = this.DOM.button.node().getBBox();
    this.DOM.button
      .classed("vzb-hidden", this.services.layout.projector || wLimit && wLimit < HIDE_WHEN_SMALLER_THAN)
      .attr("transform", `translate(${
        horizontal == "left" ? (left + warnBB.width) : (width - right)
      }, ${
        vertical == "top" ? (top + warnBB.height) : (height - bottom)
      })`);
  }

  setOptions({
    //container size
    width = 0,
    height = 0,
    //alignment
    vertical = "top", 
    horizontal = "right", 
    //margins
    top = 0,
    bottom = 0,
    left = 0,
    right = 0,
    //size limit
    wLimit = null
  } = {}) {
    runInAction(() => {
      this.vertical = vertical;
      this.horizontal = horizontal;
      this.width = width;
      this.height = height;
      this.top = top;
      this.bottom = bottom;
      this.left = left;
      this.right = right;
      this.wLimit = wLimit || width;
    });
  }

}

_DataWarning.DEFAULT_UI = {
  doubtDomain: [],
  doubtRange: []
};

//export default BubbleChart;
export const DataWarning = decorate(_DataWarning, {
  "MDL": computed,
  "vertical": observable, 
  "horizontal": observable, 
  "width": observable, 
  "height": observable, 
  "top": observable, 
  "bottom": observable, 
  "left": observable, 
  "right": observable, 
  "wLimit": observable
});