import {BaseComponent} from "../base-component.js";
import * as utils from "../../legacy/base/utils.js";
import "./datetime-background.scss";

import {decorate, computed} from "mobx";
class DateTimeBackground extends BaseComponent {

  setup(conditions) {
    this.DOM = {
      svg: this.element.append("svg"),
    };
    this.DOM.group = this.DOM.svg.append("g");
    this.DOM.textEl = this.DOM.group.append("text").style("font-size", "20px");
    this.DOM.sampleTextEl = this.DOM.group.append("text").style("font-size", "20px").style("opacity", 0);
    
    this.element.classed("vzb-datetime-background", true);

    this.width = 0;
    this.height = 0;
    this.topOffset = 0;
    this.leftOffset = 0;
    this.bottomOffset = 0;
    this.rightOffset = 0;
    this.textWidth = 0;
    this.textHeight = 0;
    this.widthRatio = 0.9;
    this.heightRatio = 0.9;
    this.xAlign = "center";
    this.yAlign = "center";

    if (conditions) this.setConditions(conditions);
  }

  updateLayoutProfile(){
    this.services.layout.size; //watch

    //this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR, this.state.positionInFacet);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;

    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  setConditions(conditions) {
    if (!isNaN(parseFloat(conditions.rightOffset)) && isFinite(conditions.rightOffset))
      this.rightOffset = conditions.rightOffset;
    
    if (!isNaN(parseFloat(conditions.leftOffset)) && isFinite(conditions.leftOffset))
      this.leftOffset = conditions.leftOffset;
    
    if (!isNaN(parseFloat(conditions.topOffset)) && isFinite(conditions.topOffset))
      this.topOffset = conditions.topOffset;
    
    if (!isNaN(parseFloat(conditions.bottomOffset)) && isFinite(conditions.bottomOffset))
      this.bottomOffset = conditions.bottomOffset;
    
    if (conditions.xAlign)
      this.xAlign = conditions.xAlign;
    
    if (conditions.yAlign)
      this.yAlign = conditions.yAlign;
    
    if (!isNaN(parseFloat(conditions.widthRatio)) && conditions.widthRatio > 0 && conditions.widthRatio <= 1)
      this.widthRatio = conditions.widthRatio;
    
    if (!isNaN(parseFloat(conditions.heightRatio)) && conditions.heightRatio > 0 && conditions.heightRatio <= 1)
      this.heightRatio = conditions.heightRatio;
    
    return this;
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame
    };
  }

  get duration(){
    //smooth animation is needed when playing, except for the case when time jumps from end to start
    if(!this.MDL.frame || !this.MDL.frame.playing) return 0;
    this.frameValue_1 = this.frameValue;
    this.frameValue = this.MDL.frame.value;
    return this.frameValue > this.frameValue_1 ? this.MDL.frame.speed : 0;
  }

  draw() {
    this.localise = this.services.locale.auto({interval: this.MDL.frame.interval});

    if (this.updateLayoutProfile()) return; //return if exists with error

    this.addReaction(this.updateText);
    this.addReaction(this.updateSize);
  }

  updateText() {
    this.setText(this.MDL.frame.value, this.duration);    
  }

  updateSize() {
    this.services.layout.size; //watch
    this._resizeText();
  }

  resizeText(width, height, topOffset, leftOffset) {
    this.width = parseInt(width, 10) || 0;
    this.height = parseInt(height, 10) || 0;

    if (topOffset) {
      this.topOffset = topOffset;
    }
    if (leftOffset) {
      this.leftOffset = leftOffset;
    }

    this._resizeText();
  }

  setText(text, delay = 0) {
    const {
      textEl,
      sampleTextEl
    } = this.DOM;

    text = this.localise(text);

    const callback = () => {
      sampleTextEl.text(text);
      this._resizeText();
      textEl.text(text);
    };

    const clear = () => {
      clearTimeout(this._text.timeout);
      delete this._text;
    };

    if (!delay) {
      if (this._text) {
        clear();
      }
      callback();
    } else {
      if (this._text) {
        this._text.callback();
        clear();
      }
      this._text = {
        callback,
        timeout: setTimeout(() => {
          callback();
          clear();
        }, delay)
      };
    }

    return this;
  }


  _resizeText() {
    const {
      textEl,
      sampleTextEl
    } = this.DOM;

    const bbox = sampleTextEl.node().getBBox();
    if (!bbox.width || !bbox.height || !this.width || !this.height) return this;

    // method from http://stackoverflow.com/a/22580176
    const widthTransform = this.width * this.widthRatio / bbox.width;
    const heightTransform = this.height * this.heightRatio / bbox.height;
    this.scalar = Math.min(widthTransform, heightTransform);
    textEl.attr("transform", "scale(" + this.scalar + ")");

    this.textHeight = bbox.height * this.scalar;
    this.textWidth = bbox.width * this.scalar;

    switch (this.yAlign) {
    case "bottom": textEl.attr("dy", ".325em"); break;
    case "center": textEl.attr("dy", ".325em"); break;
    case "top": textEl.attr("dy", "0"); break;
    }

    this.DOM.group.attr("transform", "translate(" + this._getLeftOffset() + "," + this._getTopOffset() + ")");

    return this;
  }

  _getLeftOffset() {
    switch (this.xAlign) {
    case "right":
      return this.width - this.textWidth / 2 - this.rightOffset;
    case "left":
      return this.textWidth / 2 + this.leftOffset;
    default :
      return this.width / 2;
    }
  }

  _getTopOffset() {
    switch (this.yAlign) {
    case "top":
      return this.textHeight / 2 + this.topOffset;
    case "bottom":
      return this.height - this.textHeight / 2 - this.bottomOffset;
    default :
      return this.height / 2;
    }
  }

}

const decorated = decorate(DateTimeBackground, {
  "MDL": computed,
  "duration": computed
});
export { decorated as DateTimeBackground };