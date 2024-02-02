import * as utils from "../../../legacy/base/utils";
import { BrushSlider } from "../brushslider";
import * as d3 from "d3";

import "./bubblesize.scss";
/*!
 * VIZABI BUBBLE SIZE slider
 * Reusable bubble size slider
 */

const OPTIONS = {
  PADDING: { TOP: 132, BOTTOM: 50, LEFT: 20, RIGHT: 20 },
  BAR_WIDTH: 3,
  TEXT_PARAMS: { TOP: 11, LEFT: 10, MAX_WIDTH: 42, MAX_HEIGHT: 16 },
  THUMB_STROKE_WIDTH: 2,
  THUMB_HEIGHT: 15,
  labelsValue: "domain",

  PROFILE_CONSTANTS: {
    SMALL: {
    },
    MEDIUM: {
    },
    LARGE: {
    }
  }
};

export class BubbleSize extends BrushSlider {
  setup(_options) {
    const options = utils.deepExtend(utils.deepExtend({}, OPTIONS), _options || {});

    super.setup(options);

    this.rescaler.clamp(false);

    this.showArcs = this.options.showArcs;

    if (this.showArcs) {
      this.DOM.sliderArcs = this.DOM.slider.selectAll(".vzb-bs-slider-thumb-arc").data([0, 0]).enter()
        .append("path")
        .attr("class", (d, i) => `vzb-bs-slider-thumb-arc vzb-bs-slider-thumb-arc-${i ? "max": "min"}`)
        .lower();
    }

    this.DOM.sliderLabelsWrapper = this.DOM.slider.append("g");
    this.DOM.sliderLabels = this.DOM.sliderLabelsWrapper.selectAll("text").data([0, 0]).enter()
      .append("text")
      .attr("class", "vzb-bs-slider-thumb-label")
      .attr("dy", (d, i) => i ? "-0.5em" : "1.9em");
  }

  draw() { 
    super.draw();
  
    this.addReaction(this._setLabelsText);
  }

  _getPadding() {
    const padding = super._getPadding();
    padding.top = this.options.PADDING.TOP;
    padding.left = this.options.PADDING.LEFT;
    padding.right = this.options.PADDING.RIGHT;
    padding.bottom = this.options.PADDING.BOTTOM;
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
      .outerRadius(d => _this.rescaler(d))
      .innerRadius(0)
      .startAngle(-0.5*Math.PI)
      .endAngle(1.5*Math.PI);
    this.DOM.sliderArcs.data(s)
      .attr("d", valueArc)
      .attr("transform", "translate(0,0)");
  }

  _updateLabels(s) {
    if (s) { this.DOM.sliderLabels.data(s); }
    const isRTL = this.services.locale.isRTL();
    this.DOM.sliderLabels
      .attr("transform", (d) => {
        const dX = this.rescaler(d);
        const dY = 0;
        return "translate(" + ((isRTL ? -1 : 1) * dX) + "," + (dY) + ")";
      })
      .attr("text-anchor", (d) => !isRTL && (d < this.__labelSideSwitchEdge) || isRTL && (d >= this.__labelSideSwitchEdge) ? "start" : "end")
      .attr("dx", (d, i) => ((isRTL ? -1 : 1) * ((d < this.__labelSideSwitchEdge) ? i ? 0.3 : 0.1 : i ? -0.3 : -0.4 )) + "em");
  }

  _setLabelsText() {
    let texts = [];

    if (this.MDL.model.data.isConstant) {
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

    super._updateSize();

    this.__labelSideSwitchEdge = this.rescaler.invert(this._getComponentWidth()) * 0.75;

    this.DOM.sliderLabelsWrapper
      .attr("transform", this.services.locale.isRTL() ? "scale(-1,1)" : null);
  }

  _setBrushExtent() {
    return this.brush.extent([[this.rescaler.range()[0], 0], [this._getComponentWidth(), this._getComponentHeight()]]);
  }

  _updateRescaler() {
    const minMaxBubbleRadius = this._getMinMaxBubbleRadius();
    this.rescaler.range([minMaxBubbleRadius.min, minMaxBubbleRadius.max]);
  }

}
