import * as utils from "../../../legacy/base/utils";
import { BrushSlider } from "../brushslider";

/*!
 * VIZABI BUBBLE SIZE slider
 * Reusable bubble size slider
 */

const OPTIONS = {
  propertyName: "LabelTextSize",

  PROFILE_CONSTANTS: {
    SMALL: {
      minLabelTextSize: 7,
      maxLabelTextSize: 21,
      defaultLabelTextSize: 12
    },
    MEDIUM: {
      minLabelTextSize: 7,
      maxLabelTextSize: 30,
      defaultLabelTextSize: 15
    },
    LARGE: {
      minLabelTextSize: 6,
      maxLabelTextSize: 48,
      defaultLabelTextSize: 20
    }
  }
};

export class SizeSlider extends BrushSlider {
  setup(_options) {
    const options = utils.deepExtend(utils.deepExtend({}, OPTIONS), _options || {});

    super.setup(options);

    const barWidth = this.options.BAR_WIDTH;

    this.DOM.sliderLabelsWrapper = this.DOM.slider.append("g");
    this.DOM.sliderLabelsWrapper.selectAll("text").data([0, 0]).enter()
      .append("text")
      .attr("class", (d, i) => "vzb-szs-slider-thumb-label " + (i ? "e" : "w"))
      .attr("dy", (-barWidth * 1.25) + "px");

    this.DOM.sliderLabels = this.DOM.slider.selectAll("text.vzb-szs-slider-thumb-label");

    this.propertyScale = d3.scaleLinear()
      .domain([this.options.EXTENT_MIN, this.options.EXTENT_MAX])
      .clamp(true);

  }

  draw() { 
    super.draw();

    if (this.MDL.model.data.isConstant()) {
      this.DOM.slider.selectAll(".w").classed("vzb-hidden", true);
      this.DOM.slider.select(".selection").classed("vzb-hidden", true);
      this.DOM.slider.select(".overlay").classed("vzb-pointerevents-none", true);
    } else {
      this.DOM.slider.selectAll(".w").classed("vzb-hidden", false);
      this.DOM.slider.select(".selection").classed("vzb-hidden", false);
      this.DOM.slider.select(".overlay").classed("vzb-pointerevents-none", false);
    }

    this.addReaction(this._setLabelsText);
  }

  _updateThumbs(extent) {
    this._updateLabels(extent);
  }

  _updateLabels(s) {
    if (s) { this.DOM.sliderLabels.data(s); }
    this.DOM.sliderLabels
      .attr("transform", (d, i) => {
        const dX = this.rescaler(i);
        const dY = 0;
        return "translate(" + ((this.services.locale.isRTL() ? -1 : 1) * dX) + "," + (dY) + ")";
      })
      .attr("font-size", (d) => this.propertyScale(d));
    if (this.MDL.model.data.isConstant())
      this.DOM.sliderLabels.text(d => ~~(this.propertyScale(d)) + (this.localise(this.options.constantUnit) || ""));
  }

  _setLabelsText() {
    const domain = this.MDL.model.domain;
    const texts = [domain[0], domain[domain.length - 1]].map(this.localise);

    if (this.MDL.model.data.isConstant()) return;

    this.DOM.sliderLabels.text((d, i) => texts[i]);
  }

  _getMinMaxDefaultPropertyValues() {
    const propertyName = this.options.propertyName;

    return {
      min: this.profileConstants["min" + propertyName],
      max: this.profileConstants["max" + propertyName],
      default: this.profileConstants["default" + propertyName],
    };
  }

  _updateSize() {
    const propertyValues = this._getMinMaxDefaultPropertyValues();

    this.padding.top = propertyValues.max + this.options.BAR_WIDTH * 1.25;
    this.propertyScale.range([propertyValues.min, propertyValues.max]);

    super._updateSize();

    const isRTL = this.services.locale.isRTL();
    this.DOM.sliderLabelsWrapper
      .attr("transform", isRTL ? "scale(-1,1)" : null);
    this.DOM.sliderLabels
      .attr("text-anchor", (d, i) => (isRTL ? i : !i) ? "start" : "end");
  }

  _valueToExtent(value) {
    if (this.MDL.model.data.isConstant() && value[1] === null) {
      return super._valueToExtent([value[0], this.propertyScale.invert(this._getMinMaxDefaultPropertyValues().default)]);
    }
    return super._valueToExtent(value);
  }

}
