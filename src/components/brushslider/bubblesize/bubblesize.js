import * as utils from "../../../legacy/base/utils";
import { BrushSlider } from "../brushslider";

import "./bubblesize.scss";
/*!
 * VIZABI BUBBLE SIZE slider
 * Reusable bubble size slider
 */

const OPTIONS = {
  TEXT_PARAMS: { TOP: 11, LEFT: 10, MAX_WIDTH: 42, MAX_HEIGHT: 16 },
  THUMB_STROKE_WIDTH: 4,
  labelsValue: "domain",

  PROFILE_CONSTANTS: {
    SMALL: {
      minRadiusPx: 0.5,
      maxRadiusEm: 0.05
    },
    MEDIUM: {
      minRadiusPx: 1,
      maxRadiusEm: 0.05
    },
    LARGE: {
      minRadiusPx: 1,
      maxRadiusEm: 0.05
    }
  }
};

export class BubbleSize extends BrushSlider {
  setup(_options) {
    const options = utils.deepExtend(utils.deepExtend({}, OPTIONS), _options || {});

    super.setup(options);

    this.showArcs = this.options.showArcs;

    if (this.showArcs) {
      this.DOM.sliderArcs = this.DOM.slider.selectAll(".vzb-bs-slider-thumb-arc").data([0, 0]).enter()
        .append("path")
        .attr("class", "vzb-bs-slider-thumb-arc");
    }

    this.DOM.sliderLabelsWrapper = this.DOM.slider.append("g");
    this.DOM.sliderLabels = this.DOM.sliderLabelsWrapper.selectAll("text").data([0, 0]).enter()
      .append("text")
      .attr("class", "vzb-bs-slider-thumb-label")
      .attr("text-anchor", (d, i) => i ? "start" : "end")
      .attr("dy", (d, i) => i ? "-0.7em" : "1.4em");
  }

  draw() { 
    super.draw();
  
    this.addReaction(this._setLabelsText);
  }

  _getPadding() {
    const padding = super._getPadding();
    padding.bottom = this.options.BAR_WIDTH + this.options.TEXT_PARAMS.MAX_HEIGHT;
    return padding;
  }

  _updateThumbs(extent) {
    this._updateArcs(extent);
    this._updateLabels(extent);
  }

  _updateArcs(s) {
    if (!this.showArcs) return;
    const _this = this;
    const valueArc = d3.arc()
      .outerRadius(d => _this.rescaler(d) * 0.5)
      .innerRadius(d => _this.rescaler(d) * 0.5)
      .startAngle(-Math.PI * 0.5)
      .endAngle(Math.PI * 0.5);
    this.DOM.sliderArcs.data(s)
      .attr("d", valueArc)
      .attr("transform", d => "translate(" + (_this.rescaler(d) * 0.5) + ",0)");
  }

  _updateLabels(s) {
    const _this = this;
    if (s) { this.DOM.sliderLabels.data(s); }
    this.DOM.sliderLabels
      .attr("transform", (d, i) => {
        const textMargin = { v: this.options.TEXT_PARAMS.TOP, h: this.options.TEXT_PARAMS.LEFT };
        const dX = textMargin.h * (i ? 0.5 : -1.0) + this.rescaler(d);
        const dY = 0;
        return "translate(" + ((this.services.locale.isRTL() ? -1 : 1) * dX) + "," + (dY) + ")";
      });
  }

  _setLabelsText() {
    let texts = [];

    if (this.MDL.model.data.isConstant()) {
      texts = ["", ""];
    } else {
      texts = this.MDL.model[this.options.labelsValue].map(this.localise);
    }

    this.DOM.sliderLabels.text((d, i) => texts[i]);
  }

  _getMinMaxBubbleRadius() {
    if(this.root.ui.minMaxRadius) return this.root.ui.minMaxRadius;
    const range = this.model.encoding.size.scale.range;
    const min = utils.areaToRadius(d3.min(range));
    const max = utils.areaToRadius(d3.max(range));
    return { min, max };
  }

  _updateSize() {
    const minMaxBubbleRadius = this._getMinMaxBubbleRadius();
    const padding = this.element.node().offsetWidth - minMaxBubbleRadius.max * 2;
    this.padding.top = minMaxBubbleRadius.max + this.options.BAR_WIDTH,
    this.padding.left = padding * 0.5;
    this.padding.right = padding * 0.5;

    super._updateSize();

    this.DOM.sliderLabelsWrapper
      .attr("transform", this.isRTL ? "scale(-1,1)" : null);
    this.DOM.sliderLabels
      .attr("text-anchor", (d, i) => (this.isRTL ? !i : i) ? "start" : "end");
  }

  _updateRescaler() {
    const minMaxBubbleRadius = this._getMinMaxBubbleRadius();
    this.rescaler.range([minMaxBubbleRadius.min * 2, minMaxBubbleRadius.max * 2]);
  }

  _getComponentWidth() {
    return this._getMinMaxBubbleRadius().max * 2;
  }

}
