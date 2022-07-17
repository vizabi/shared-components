import * as utils from "../../../legacy/base/utils";
import { BrushSlider } from "../brushslider";

import "./singlehandleslider.scss";
/*!
 * VIZABI BUBBLE SIZE slider
 * Reusable bubble size slider
 */

const OPTIONS = {
  THUMB_HEIGHT: 17,
  THUMB_STROKE_WIDTH: 3,
  domain: null,
  suppressInput: null,
  snapValue: null
};

export class SingleHandleSlider extends BrushSlider {


  setup(_options) {
    this.type = this.type || "singlehandleslider";
    
    const options = utils.extend(utils.extend({}, OPTIONS), _options || {});

    super.setup(options);

    if (this.options.domain) this._setDomain(this.options.domain);

    this.DOM.slider.selectAll(".w").classed("vzb-hidden", true);
    this.DOM.slider.select(".selection").classed("vzb-hidden", true);

    this.DOM.slider.select(".overlay")
      .lower()
      .style("stroke-opacity", "0")
      .style("stroke-width", (this.options.THUMB_HEIGHT * 0.5) + "px")
      .attr("rx", this.options.BAR_WIDTH * 0.5)
      .attr("ry", this.options.BAR_WIDTH * 0.5);

    this.DOM.slider.selectAll(".vzb-slider-thumb-badge")
      .style("stroke-width", this.options.THUMB_STROKE_WIDTH + "px");
  }

  _setDomain(domain){
    this.options.EXTENT_MIN = this.options.domain[0];
    this.options.EXTENT_MAX = this.options.domain[this.options.domain.length - 1];
    this.rescaler.domain(domain);
  }

  _createThumbs(thumbsEl) {
    const halfThumbHeight = this.options.THUMB_HEIGHT * 0.5;

    const thumbArc = d3.arc()
      .outerRadius(halfThumbHeight)
      .startAngle(0)
      .endAngle(2 * Math.PI);

    thumbsEl
      .attr("transform", "translate(" + (halfThumbHeight + this.options.THUMB_STROKE_WIDTH * 0.5) + "," + (halfThumbHeight + this.options.THUMB_STROKE_WIDTH * 0.5) + ")")
      .append("path")
      .attr("d", thumbArc);
  }

  _getBrushEventListeners() {
    const _this = this;
    const _superListeners = super._getBrushEventListeners();

    return {
      start: _superListeners.start,
      brush: (event, d) => {
        if (this.nonBrushChange || !event.sourceEvent) return;

        if (!this.options.suppressInput) {
          _superListeners.brush.call(this, event, d);
        } else {
          this._savedSelection = event.selection;
          this._snap(event.selection);
        }
      },
      end:(event, d) => {
        if (this.nonBrushChange || !event.sourceEvent) return;

        if (this.options.snapValue) {
          this._snap(event.selection || this._savedSelection);
        } else {
          this.DOM.slider.call(this.brush.move, [this.rescaler.range()[0], this._savedSelection[1]]);
        }
        this._setFromExtent(true, true); // force a persistent change
        this._savedSelection = void 0;
      }
    };
  }

  _snap(selection) {
    let value = this.rescaler.invert(this._extentToValue(selection));
    const domain = this.rescaler.domain();
    const ascendingDomain = domain[domain.length - 1] > domain[0];
    const next = d3.bisector(d3[ascendingDomain ? "ascending" : "descending"]).left(domain, value) || 1;
    value = (ascendingDomain ? 1 : -1) * ((value - domain[next - 1]) - (domain[next] - value)) > 0 ? domain[next] : domain[next - 1];
    this._moveBrush(this._valueToExtent(value));
  }

  _getHandleSize() {
    return this.options.THUMB_HEIGHT + this.options.THUMB_STROKE_WIDTH;
  }

  _getPadding() {
    const barWidth = this.options.BAR_WIDTH;
    const thumbHeight = this.options.THUMB_HEIGHT;
    const padding = super._getPadding();

    padding.top = (thumbHeight + this.options.THUMB_STROKE_WIDTH) * 0.5;
    padding.bottom = (thumbHeight + this.options.THUMB_STROKE_WIDTH) * 0.5 - barWidth;
    
    return padding;
  }

  _updateSize() {
    super._updateSize();

    const componentWidth = this._getComponentWidth();
    this.rescaler.range(d3.range(0, componentWidth || 1, (componentWidth / (this.rescaler.domain().length - 1)) || 1).concat([componentWidth]));
  }

  _valueToExtent(value) {
    return [this.rescaler.domain()[0], value];
  }

  _extentToValue(extent) {
    return extent[1];
  }

  _setModel(value, force, persistent) {
    if (this.options.suppressInput) {
      const _value = this._extentToValue(value).toFixed(this.options.ROUND_DIGITS);
      if (_value == this.MDL.model[this.value]) return;
    }
    super._setModel(value, force, persistent);
  }

}
