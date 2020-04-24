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
      .attr("font-size", (d, i) => this.propertyScale(d));
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
    }
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


const _SizeSlider = {

  /**
   * Initializes the timeslider.
   * Executed once before any template is rendered.
   * @param config The options passed to the component
   * @param context The component's parent
   */
  init(config, context) {

    this.name = "sizeslider";

    const options = utils.extend({}, OPTIONS);
    this.options = utils.extend(options, this.options || {});
    const profiles = utils.extend({}, PROFILES);
    this.profiles = utils.extend(profiles, this.profiles || {});

    //this.template = this.template || require("./sizeslider.html");

    this.propertyName = config.propertyName;

    this.model_expects = [{
      name: "submodel",
      type: "size"
    }, {
      name: "locale",
      type: "locale"
    }];

    const _this = this;

    this.changeHandler = this.changeHandler.bind(this);
    this.readyHandler = this.readyHandler.bind(this);

    this.model_binds = {
      "change:submodel.domainMin": this.changeHandler,
      "change:submodel.domainMax": this.changeHandler
    };

    this._setModel = utils.throttle(this._setModel, 50);
    //contructor is the same as any component
    this._super(config, context);
  },

  changeHandler(evt, path) {
    const extent = this.model.submodel.extent || [this.options.EXTENT_MIN, this.options.EXTENT_MAX];
    this._updateLabels(extent);
    this._super(evt, path);
  },

  readyHandler(evt) {
    this.modelUse = this.model.submodel.use;
    const extent = this.model.submodel.extent || [this.options.EXTENT_MIN, this.options.EXTENT_MAX];
    if (this.modelUse != "constant") {
      this.sizeScaleMinMax = this.model.submodel.getScale().domain();
      this.sliderEl.selectAll(".w").classed("vzb-hidden", false);
      this.sliderEl.select(".selection").classed("vzb-hidden", false);
      this.sliderEl.select(".overlay").classed("vzb-pointerevents-none", false);
      this._setLabelsText();
    } else {
      this.sliderEl.selectAll(".w").classed("vzb-hidden", true);
      this.sliderEl.select(".selection").classed("vzb-hidden", true);
      this.sliderEl.select(".overlay").classed("vzb-pointerevents-none", true);
      if (!this.model.submodel.which) {
        const p = this.propertyActiveProfile;
        extent[1] = (p.default - p.min) / (p.max - p.min);
        this.model.submodel.which = "_default";
      }
    }
    this._moveBrush(extent);
  },

  /**
   * Executes after the template is loaded and rendered.
   * Ideally, it contains HTML instantiations related to template
   * At this point, this.element and this.placeholder are available as a d3 object
   */
  readyOnce() {
    const _this = this;
    this._super();

    const options = this.options;

    const barWidth = options.BAR_WIDTH;

    this.propertyActiveProfile = this.getPropertyActiveProfile();

    this.propertyScale = d3.scaleLinear()
      .domain([options.EXTENT_MIN, options.EXTENT_MAX])
      .range([this.propertyActiveProfile.min, this.propertyActiveProfile.max])
      .clamp(true);

    this.padding.top = this.propertyActiveProfile.max + barWidth * 1.25;

    this.translator = this.model.locale.getTFunction();

    this.sliderLabelsWrapperEl = this.sliderEl.append("g");
    this.sliderLabelsWrapperEl.selectAll("text").data([0, 0]).enter()
      .append("text")
      .attr("class", (d, i) => "vzb-szs-slider-thumb-label " + (i ? "e" : "w"))
      .attr("dy", (-barWidth * 1.25) + "px");

    this.sliderLabelsEl = this.sliderEl.selectAll("text.vzb-szs-slider-thumb-label");

    this.sizeScaleMinMax = this.model.submodel.getScale().domain();

    if (this.sizeScaleMinMax) {
      this._setLabelsText();
    }

    if (this.model._ready) this.readyHandler();
  },

  ready() {
    this._super();
    this._updateLabels();
  },

  getPropertyActiveProfile() {
    const profile = this.profiles[this.getLayoutProfile()];
    return { min: profile["min" + this.propertyName], max: profile["max" + this.propertyName], default: profile["default" + this.propertyName] };
  },

  /*
   * RESIZE:
   * Executed whenever the container is resized
   */
  _updateSize() {
    this._super();
    this.sliderLabelsWrapperEl
      .attr("transform", this.isRTL ? "scale(-1,1)" : null);
    this.sliderLabelsEl
      .attr("text-anchor", (d, i) => (this.isRTL ? i : !i) ? "start" : "end");
  },

  _resize() {
    this.propertyActiveProfile = this.getPropertyActiveProfile();
    this.propertyScale.range([this.propertyActiveProfile.min, this.propertyActiveProfile.max]);
    this.padding.top = this.propertyActiveProfile.max + this.options.BAR_WIDTH * 1.25;

    this._super();
  },

  _updateThumbs(extent) {
    this._updateLabels(extent);
  },

  _updateLabels(s) {
    const _this = this;
    if (s) { this.sliderLabelsEl.data(s); }
    this.sliderLabelsEl
      .attr("transform", (d, i) => {
        const dX = _this.rescaler(i);
        const dY = 0;
        return "translate(" + ((_this.isRTL ? -1 : 1) * dX) + "," + (dY) + ")";
      })
      .attr("font-size", (d, i) => _this.propertyScale(d));
    if (_this.model.submodel.use === "constant")
      this.sliderLabelsEl.text(d => ~~(_this.propertyScale(d)) + (_this.translator(_this.ui.constantUnit) || ""));
  },

  _setLabelsText() {
    const _this = this;
    const texts = [_this.model.submodel.getTickFormatter()(_this.sizeScaleMinMax[0]), _this.model.submodel.getTickFormatter()(_this.sizeScaleMinMax[1])];
    _this.sliderLabelsEl
      .text((d, i) => texts[i]);
  }

}
