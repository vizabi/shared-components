import { BaseComponent } from "../base-component.js";
import { PlayButton } from "./play-button.js";
import axisSmart from "../../legacy/helpers/d3.axisWithLabelPicker";
import * as utils from "../../legacy/base/utils";
import "./time-slider.scss";

const PROFILE_CONSTANTS = {
  SMALL: {
    margin: {
      top: 7,
      right: 25,
      bottom: 10,
      left: 60
    },
    radius: 8,
    label_spacing: 5
  },
  MEDIUM: {
    margin: {
      top: 0,
      right: 25,
      bottom: 10,
      left: 55
    },
    radius: 9,
    label_spacing: 5
  },
  LARGE: {
    margin: {
      top: -5,
      right: 25,
      bottom: 10,
      left: 80
    },
    radius: 11,
    label_spacing: 8
  }
};


const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    margin: {
      top: 9,
      right: 25,
      bottom: 10,
      left: 55
    }
  },
  LARGE: {
    margin: {
      top: -5,
      right: 25,
      bottom: 10,
      left: 80
    }
  }
};

const precision = 1;

//constants
const class_playing = "vzb-playing";
const class_loading = "vzb-ts-loading";
const class_hide_play = "vzb-ts-hide-play-button";
const class_dragging = "vzb-ts-dragging";
const class_axis_aligned = "vzb-ts-axis-aligned";
const class_show_value = "vzb-ts-show-value";
const class_show_value_when_drag_play = "vzb-ts-show-value-when-drag-play";

export class TimeSlider extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: PlayButton,
      placeholder: ".vzb-ts-btns",
      //model: this.model
    }];

    config.template = `
      <div class="vzb-ts-slider">
        <svg class="vzb-ts-slider-svg">
          <g>
            <g class="vzb-ts-slider-axis"></g>
            <g class="vzb-ts-slider-progress"></g>
            <g class="vzb-ts-slider-select"></g>
            <line class="vzb-ts-slider-forecastboundary"></line>
            <circle class="vzb-ts-slider-handle"></circle>
            <text class="vzb-ts-slider-value"></text>
            <line class="vzb-ts-slider-slide"></line>
          </g>
        </svg>      
      </div>
      <div class="vzb-ts-btns"></div>
    `;
    super(config);
  }

  setup() {
    this.dragging = false;

    this.DOM = {
      //slider: this.element.select(".vzb-ts-slider")
      slider_outer: this.element.select(".vzb-ts-slider-svg"),
      axis: this.element.select(".vzb-ts-slider-axis"),
      select: this.element.select(".vzb-ts-slider-select"),
      progressBar: this.element.select(".vzb-ts-slider-progress"),
      slide: this.element.select(".vzb-ts-slider-slide"),
      forecastBoundary: this.element.select(".vzb-ts-slider-forecastboundary"),
      handle: this.element.select(".vzb-ts-slider-handle"),
      valueText: this.element.select(".vzb-ts-slider-value")
    };

    this.DOM.slider = this.DOM.slider_outer.select("g");

    //Scale
    this.xScale = d3.scaleUtc()
      .clamp(true);

    //Axis
    this.xAxis = axisSmart("bottom");

    const { valueText, slider, slide, slider_outer } = this.DOM;
    //Value
    valueText.classed("stroke", true);
    if (!slider.style("paint-order").length) {
      slider.insert("text", ".vzb-ts-slider-value")
        .attr("class", "vzb-ts-slider-value stroke");

      valueText.classed("stroke", false);
    }
    this.DOM.valueText = this.element.selectAll(".vzb-ts-slider-value")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.7em");

    const brushed = this._getBrushed();
    const brushedEnd = this._getBrushedEnd();
  
    this.brush = d3.drag()
      //.on("start.interrupt", function() { _this.slide.interrupt(); })
      .on("start drag", function() {
        brushed.call(this);
      })
      .on("end", function() {
        brushedEnd.call(this);
      });

    //Slide
    slide.call(this.brush);

    slider_outer.on("mousewheel", () => {
      //do nothing and dont pass the event on if we are currently dragging the slider
      if (this.dragging) {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        d3.event.returnValue = false;
        return false;
      }
    });

  }

  draw() {
    this.MDL = {
      frame: this.model.encoding.get("frame")
    }
    this.localise = this.services.locale.auto();
    
    this.element.classed(class_loading, false);
    
    this.xScale.domain(this.MDL.frame.data.domain);

    if (this._updateLayoutProfile()) return; //return if exists with error

    this.addReaction(this._updateSize);
    this.addReaction(this._optionClasses);
    this.addReaction(this._setHandle);

  }

  // _changeLimits() {
  //   const minValue = this.model.time.start;
  //   const maxValue = this.model.time.end;
  //   //scale
  //   this.xScale.domain([minValue, maxValue]);
  //   //axis
  //   this.xAxis.tickValues([minValue, maxValue])
  //     .tickFormat(this.model.time.getFormatter());
  // }

  _updateLayoutProfile(){
    this.services.layout.size;
    this.services.layout.width + this.services.layout.height;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return utils.warn("Timeslider _updateProfile() abort: container is too little or has display:none");
  }

  /**
   * Executes everytime the container or vizabi is resized
   * Ideally,it contains only operations related to size
   */
  _updateSize() {
    this.services.layout.size;
    this.services.layout.width + this.services.layout.height;

    const {
      margin,
      radius,
      label_spacing
    } = this.profileConstants;

    const {
      slider,
      slide,
      axis,
      handle,
      select,
      progressBar
    } = this.DOM;

    // const slider_w = parseInt(this.slider_outer.style("width"), 10) || 0;
    // const slider_h = parseInt(this.slider_outer.style("height"), 10) || 0;

    // if (!slider_h || !slider_w) return utils.warn("time slider resize() aborted because element is too small or has display:none");

    this.sliderWidth = this.width - margin.left - margin.right;
    this.sliderHeight = this.height - margin.bottom - margin.top;
    const _this = this;

    //translate according to margins
    slider.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.xScale.range([0, this.sliderWidth]);

    slide
      .attr("transform", "translate(0," + this.sliderHeight / 2 + ")")
      .attr("x1", this.xScale.range()[0])
      .attr("x2", this.xScale.range()[1])
      .style("stroke-width", radius * 2 + "px");

    //adjust axis with scale
    this.xAxis.scale(this.xScale)
      .tickSizeInner(0)
      .tickSizeOuter(0)
      .tickPadding(label_spacing)
      .tickSizeMinor(0, 0);

    axis.attr("transform", "translate(0," + this.sliderHeight / 2 + ")")
      .classed("vzb-hidden", this.services.layout.projector)
      .call(this.xAxis);

    select.attr("transform", "translate(0," + this.sliderHeight / 2 + ")");
    progressBar.attr("transform", "translate(0," + this.sliderHeight / 2 + ")");

    //size of handle
    handle.attr("transform", "translate(0," + this.sliderHeight / 2 + ")")
      .attr("r", radius);

    //this.sliderWidth = slider.node().getBoundingClientRect().width;

    // const forecastBoundaryIsOn = this.model.time.end > this.model.time.endBeforeForecast;
    // this.forecastBoundary
    //   .classed("vzb-hidden", !forecastBoundaryIsOn);

    // if (forecastBoundaryIsOn) {
    //   this.forecastBoundary
    //     .attr("transform", "translate(0," + this.height / 2 + ")")
    //     .attr("x1", this.xScale(this.model.time.endBeforeForecast) - this.profile.radius / 2)
    //     .attr("x2", this.xScale(this.model.time.endBeforeForecast) + this.profile.radius / 2)
    //     .attr("y1", radius)
    //     .attr("y2", radius);
    // }

    // this.resizeSelectedLimiters();
    // this._resizeProgressBar();
    // this._setHandle();

  }

  /**
   * Returns width of slider text value.
   * Parameters in this function needed for memoize function, so they are not redundant.
   */
  _getValueWidth(layout, value) {
    return this.valueText.node().getBoundingClientRect().width;
  }

  _getBrushed() {
    const _this = this;
    return function() {

      const { frame } = _this.MDL;
      const { handle, valueText } = _this.DOM;

      if (frame.playing) {
        frame.stopPlaying();
      }

      _this.dragging = true;
      _this.element.classed(class_dragging, _this.dragging);

      let value;// = _this.brush.extent()[0];
      //var value = d3.brushSelection(_this.slide.node());

      //if(!value) return;

      //set brushed properties

      if (d3.event.sourceEvent) {
        // Prevent window scrolling on cursor drag in Chrome/Chromium.
        d3.event.sourceEvent.preventDefault();

        //_this.model.time.dragStart();
        let posX = utils.roundStep(Math.round(d3.mouse(this)[0]), precision);
        const maxPosX = _this.sliderWidth;

        const forecastBoundaryIsOn = frame.data.domain[1] > frame.endBeforeForecast;
        const forecastBoundaryPos = _this.xScale(frame.endBeforeForecast);
        const snappyMargin = 0.5 * handle.attr("r");

        if (posX > maxPosX) {
          posX = maxPosX;
        } else if (posX < 0) {
          posX = 0;
        } else if ((Math.abs(posX - forecastBoundaryPos) < snappyMargin) && !d3.event.sourceEvent.shiftKey && forecastBoundaryIsOn) {
          posX = forecastBoundaryPos;
        }

        value = _this.xScale.invert(posX);
        //set handle position
        handle.attr("cx", posX);
        valueText.attr("transform", "translate(" + posX + "," + (_this.sliderHeight / 2) + ")");
        valueText.text(_this.localise(value));
      }

      //set time according to dragged position
      if (value - _this.MDL.frame.value !== 0) {
        _this._setTime(value, true);
      }
    };
  }

  /**
   * Gets brushedEnd function to be executed when dragging ends
   * @returns {Function} brushedEnd function
   */
  _getBrushedEnd() {
    const _this = this;
    return function() {
      //_this._setTime.recallLast();
      _this.dragging = false;
      _this.element.classed(class_dragging, _this.dragging);
      //_this.model.time.dragStop();
      //_this.model.time.snap();
      _this._setTime(_this.MDL.frame.value);
    };
  }

  _setHandle(transition) {
    this.services.layout.size;
    const { value, speed, playing } = this.MDL.frame;

    if (this.dragging) return;
    const { handle, valueText } = this.DOM; 
  
    //this.slide.call(this.brush.extent([value, value]));
    const newPos = this.xScale(value);
    //this.brush.move(this.slide, [newPos, newPos])

    //this.element.classed("vzb-ts-disabled", this.model.time.end <= this.model.time.start);
    //    this.valueText.text(this.model.time.formatDate(value));

    //    var old_pos = this.handle.attr("cx");
    //var newPos = this.xScale(value);
    //if (_this.prevPosition == null) _this.prevPosition = newPos;
    //const delayAnimations = newPos > _this.prevPosition ? this.model.time.delayAnimations : 0;
    const delayAnimations = speed;
    if (playing) {
      handle//.attr("cx", _this.prevPosition)
        .transition()
        .duration(delayAnimations)
        .ease(d3.easeLinear)
        .attr("cx", newPos);

      valueText//.attr("transform", "translate(" + _this.prevPosition + "," + (this.height / 2) + ")")
        .transition("text")
        .delay(delayAnimations)
        .text(this.localise(value));
      valueText
        .transition()
        .duration(delayAnimations)
        .ease(d3.easeLinear)
        .attr("transform", "translate(" + newPos + "," + (this.sliderHeight / 2) + ")");
    } else {
      handle
        //cancel active transition
        .interrupt()
        .attr("cx", newPos);

      valueText
        //cancel active transition
        .interrupt()
        .interrupt("text")
        .transition("text");
      valueText
        .attr("transform", "translate(" + newPos + "," + (this.sliderHeight / 2) + ")")
        .text(this.localise(value));
    }
    //_this.prevPosition = newPos;

  }

  /**
   * Sets the current time model to time
   * @param {number} time The time
   */
  _setTime(time, transaction) {
    //update state
    const _this = this;
    //  frameRate = 50;

    //avoid updating more than once in "frameRate"
    //var now = new Date();
    //if (this._updTime != null && now - this._updTime < frameRate) return;
    //this._updTime = now;
    //const persistent = !this.model.time.dragging && !this.model.time.playing;
    //_this.model.time.getModelObject("value").set(time, false, persistent); // non persistent
    _this.MDL.frame.setValue(time, transaction);

  }

  /**
   * Applies some classes to the element according to options
   */
  _optionClasses() {
    //show/hide classes
    const { frame } = this.MDL;

    const show_ticks = this.ui.show_ticks;
    const show_value = this.ui.show_value;
    const show_value_when_drag_play = this.ui.show_value_when_drag_play;
    const axis_aligned = this.ui.axis_aligned;
    const show_play = (this.ui.show_button) && (frame.playable);

    this.xAxis.labelerOptions({
      scaleType: "time",
      removeAllLabels: !show_ticks,
      limitMaxTickNumber: 3,
      showOuter: false,
      toolMargin: {
        left: 10,
        right: 10,
        top: 0,
        bottom: 30
      },
      fitIntoScale: "optimistic"
    });
    this.DOM.axis.call(this.xAxis);

    this.element.classed(class_hide_play, !show_play);
    this.element.classed(class_playing, frame.playing);
    this.element.classed(class_show_value, show_value);
    this.element.classed(class_show_value_when_drag_play, show_value_when_drag_play);
    this.element.classed(class_axis_aligned, axis_aligned);
  }
}

TimeSlider.DEFAULT_UI = {
  show_ticks: false,
  show_value: false,
  show_value_when_drag_play: true,
  axis_aligned: false,
  show_button: true
}
