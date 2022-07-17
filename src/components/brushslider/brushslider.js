import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import {decorate, computed} from "mobx";

import "./brushslider.scss";

/*!
 * VIZABI BUBBLE SIZE slider
 * Reusable bubble size slider
 */

const OPTIONS = {
  EXTENT_MIN: 0,
  EXTENT_MAX: 1,
  BAR_WIDTH: 6,
  THUMB_HEIGHT: 20,
  THUMB_STROKE_WIDTH: 4,
  INTRO_DURATION: 250,
  ROUND_DIGITS: 2,
  value: "extent",
  setValueFunc: null,
  submodel: null,
  submodelFunc: null,

  PROFILE_CONSTANTS: {
    SMALL: {
    },
    MEDIUM: {
    },
    LARGE: {
    }
  },

  PROFILE_CONSTANTS_FOR_PROJECTOR: {
    SMALL: {
    },
    MEDIUM: {
    },
    LARGE: {
    }
  }
};

class BrushSlider extends BaseComponent {
  constructor (config) {
    config.template = `
      <div class="vzb-slider-holder">
        <svg class="vzb-slider-svg">
          <g class="vzb-slider-wrap">
            <g class="vzb-slider">
            </g>
          </g>
        </svg>
      </div>  
    `;

    super(config);

    this._setModel = utils.throttle(this._setModel, 50);
  }

  setup(_options) {
    this.type = this.type || "brushslider";

    this.DOM = {
      sliderSvg: this.element.select(".vzb-slider-svg"),
      sliderWrap: this.element.select(".vzb-slider-wrap"),
      slider: this.element.select(".vzb-slider")
    };
    this.DOM.slider.classed("vzb-slider-" + this.constructor.name.toLowerCase(), true);
  
    const options = this.options = utils.deepExtend(utils.deepExtend({}, OPTIONS), _options || {});

    this.value = options.value;
    this.submodel = options.submodel;
    this.submodelFunc = options.submodelFunc;
    this.setValueFunc = options.setValueFunc;

    this.padding = this._getPadding();
    
    this.rescaler = d3.scaleLinear()
      .domain([options.EXTENT_MIN, options.EXTENT_MAX])
      .clamp(true);

    this.brushEventListeners = this._getBrushEventListeners();

    this.brush = d3.brushX()
      .handleSize(this._getHandleSize())
      .on("start", this.brushEventListeners.start)
      .on("brush", this.brushEventListeners.brush)
      .on("end", this.brushEventListeners.end);

    this.DOM.sliderThumbs = this.DOM.slider.selectAll(".handle")
      .data([{ type: "w" }, { type: "e" }], d => d.type)
      .enter().append("svg").attr("class", d => "handle handle--" + d.type + " " + d.type)
      .classed("vzb-slider-thumb", true);

    this._createThumbs(
      this.DOM.sliderThumbs.append("g")
        .attr("class", "vzb-slider-thumb-badge")
    );

    this.DOM.slider
      .call(this.brush);

    const barWidth = options.BAR_WIDTH;

    this.DOM.slider.selectAll(".selection,.overlay")
      .attr("height", barWidth)
      .attr("rx", barWidth * 0.25)
      .attr("ry", barWidth * 0.25)
      .attr("transform", "translate(0," + (-barWidth * 0.5) + ")");

  }
  
  get MDL() {
    return {
      model: this._getModel()
    };
  }

  draw() {
    this.localise = this.services.locale.auto();
    if(this.element.classed("vzb-hidden")) return;
    if(this._updateLayoutProfile()) return;

    this.addReaction(this._updateSize);
    this.addReaction(this._updateView);
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(this.options.PROFILE_CONSTANTS, this.options.PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = (this.element.node().clientHeight) || 0;
    this.width = (this.element.node().clientWidth) || 0;
    if (!this.height || !this.width) return utils.warn("Slider _updateProfile() abort: container is too little or has display:none");
  }

  _getPadding() {
    const halfThumbHeight = this.options.THUMB_HEIGHT * 0.5;

    return {
      top: this.options.BAR_WIDTH * 0.5,
      left: halfThumbHeight,
      right: halfThumbHeight,
      bottom: halfThumbHeight + this.options.THUMB_STROKE_WIDTH
    };
  }
  
  _getHandleSize() {
    return this.options.THUMB_HEIGHT + this.options.BAR_WIDTH * 2;
  }

  _getComponentWidth() {
    const width = this.element.node().offsetWidth - this.padding.left - this.padding.right;
    return width < 0 ? 0 : width;
  }

  _getComponentHeight() {
    return this.options.BAR_WIDTH;
  }

  _getBrushEventListeners() {
    const _this = this;

    return {
      start: (event) => {
        if (_this.nonBrushChange || !event.sourceEvent) return;

        this._savedSelection = event.selection;
        this._setFromExtent(false, false, false);
      },
      brush: (event) => {
        if (this.nonBrushChange || !event.sourceEvent) return;

        this._savedSelection = event.selection;
        this._setFromExtent(true, false, false); // non persistent change
      },
      end: (event) => {
        if (this.nonBrushChange || !event.sourceEvent) return;

        if (event.selection === null) {
          this.DOM.slider.call(this.brush.move, this._savedSelection);
        }
        this._setFromExtent(true, true); // force a persistent change
        this._savedSelection = void 0;
      }
    };
  }

  _createThumbs(thumbsEl) {
    const barWidth = this.options.BAR_WIDTH;
    const halfThumbHeight = this.options.THUMB_HEIGHT * 0.5;
    thumbsEl.append("path")
      .attr("d", "M" + (halfThumbHeight + barWidth) + " " + (halfThumbHeight + barWidth * 1.5) + "l" + (-halfThumbHeight) + " " + (halfThumbHeight * 1.5) + "h" + (halfThumbHeight * 2) + "Z");
  }

  _updateThumbs() {
  }

  _updateSize() {
    this.services.layout.size;

    const svgWidth = this._getComponentWidth() + this.padding.left + this.padding.right;

    this.DOM.sliderSvg
      .attr("height", this._getComponentHeight() + this.padding.top + this.padding.bottom)
      .attr("width", svgWidth);
    this.DOM.sliderWrap
      .attr("transform", this.isRTL ? "translate(" + (svgWidth - this.padding.right) + "," + this.padding.top + ") scale(-1,1)" :
        "translate(" + this.padding.left + "," + this.padding.top + ")");
  
    this._updateRescaler();
  }

  _updateRescaler() {
    const componentWidth = this._getComponentWidth();
    this.rescaler.range([0, componentWidth]);
  }

  _getModel() {
    if (this.submodelFunc) {
      return this.submodelFunc.call(this.model);
    } else if (this.submodel) {
      const model = utils.getProp(this, this.submodel.split("."));
      if (!model) console.error(`Slider inside ${this.parent.name || this.parent.constructor.name} was not able to access part of model ${this.submodel}`);
      return model;
    } else {
      return this.model;
    }
  }

  _updateView() {
    this.services.layout.size;
    const value = this.MDL.model[this.value];

    if (!value && value!==0 && value!==false) 
      console.error(`Slider inside ${this.parent.name || this.parent.constructor.name} was unable to access value ${this.value} in its model`);

    this.DOM.slider.call(this.brush.extent([[0, 0], [this._getComponentWidth(), this._getComponentHeight()]]));
    const extent = this._valueToExtent(value) || [this.options.EXTENT_MIN, this.options.EXTENT_MAX];
    this._moveBrush(extent);
    this._updateThumbs(extent);
  }

  _moveBrush(s) {
    const _s = s.map(this.rescaler);
    this.nonBrushChange = true;
    this.DOM.slider.call(this.brush.move, [_s[0], _s[1]]);
    this.nonBrushChange = false;
    this._setFromExtent(false, false, false);
  }

  _valueToExtent(value) {
    return value;
  }

  _extentToValue(extent) {
    return extent;
  }

  /**
   * Prepares setting of the current model with the values from extent.
   * @param {boolean} set model
   * @param {boolean} force force firing the change event
   * @param {boolean} persistent sets the persistency of the change event
   */
  _setFromExtent(setModel, force, persistent) {
    let s = d3.brushSelection(this.DOM.slider.node());
    if (!s) return;
    s = [this.rescaler.invert(s[0]), this.rescaler.invert(s[1])];
    this._updateThumbs(s);
    if (setModel) this._setModel(s, force, persistent);
  }

  /**
   * Sets the current value in model. avoid updating more than once in framerate
   * @param {number} value
   * @param {boolean} force force firing the change event
   * @param {boolean} persistent sets the persistency of the change event
   */
  _setModel(value) {
    const roundDigits = this.options.ROUND_DIGITS;
    value = [+value[0].toFixed(roundDigits), +value[1].toFixed(roundDigits)];
    if (this.setValueFunc) {
      this.MDL.model[this.setValueFunc](this._extentToValue(value));
    } else {
      this.MDL.model[this.value] = this._extentToValue(value);
    }
  }

}

const decorated = decorate(BrushSlider, {
  "MDL": computed
});
export { decorated as BrushSlider};

