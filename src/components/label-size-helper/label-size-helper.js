import * as utils from "../../legacy/base/utils.js";
import {BaseComponent} from "../base-component.js";
import {decorate, computed, } from "mobx";

const PROFILE_CONSTANTS = {
  SMALL: {
    minLabelTextSize: 7,
    maxLabelTextSize: 21,
    defaultLabelTextSize: 12,
    closeCrossSize: 16 * 1.2,
    labelLeashCoeff: 0.4
  },
  MEDIUM: {
    minLabelTextSize: 7,
    maxLabelTextSize: 30,
    defaultLabelTextSize: 15,
    closeCrossSize: 20 * 1.2,
    labelLeashCoeff: 0.3
  },
  LARGE: {
    minLabelTextSize: 6,
    maxLabelTextSize: 48,
    defaultLabelTextSize: 20,
    closeCrossSize: 22 * 1.2,
    labelLeashCoeff: 0.2
  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    minLabelTextSize: 15,
    maxLabelTextSize: 35,
    defaultLabelTextSize: 15,
    closeCrossSize: 26 * 1.2,
    labelLeashCoeff: 0.3
  },
  LARGE: {
    minLabelTextSize: 20,
    maxLabelTextSize: 55,
    defaultLabelTextSize: 20,
    closeCrossSize: 32 * 1.2,
    labelLeashCoeff: 0.2
  }
};

const OPTIONS = {
  SUPPRESS_HIGHLIGHT_DURING_PLAY: true
};

class LabelSizeHelper extends BaseComponent {

  setup(options){
    this.context = this.parent;

    this.labelSizeTextScale = null;
    
    this.options = utils.extend({}, OPTIONS);
    if(options) this.setOptions(options);
  }

  setOptions(newOptions) {
    utils.extend(this.options, newOptions);
  }

  get MDL() {
    return{
      size_label: this.model.encoding.size_label,
    };
  }

  draw() {
    this.addReaction(this._updateLayoutProfile);
    this.addReaction(this.updateSizeTextScale);
    this.addReaction(this.updateLabelSizeLimits);
  }

  updateLabelSizeLimits() {
    if (!this.MDL.size_label) return;

    this.services.layout.size;

    const extent = this.MDL.size_label.scale.extent || [0, 1];

    const minLabelTextSize = this.profileConstants.minLabelTextSize;
    const maxLabelTextSize = this.profileConstants.maxLabelTextSize;
    const minMaxDelta = maxLabelTextSize - minLabelTextSize;

    this.minLabelTextSize = Math.max(minLabelTextSize + minMaxDelta * extent[0], minLabelTextSize);
    this.maxLabelTextSize = Math.max(minLabelTextSize + minMaxDelta * extent[1], minLabelTextSize);

    if (this.MDL.size_label.data.isConstant) {
      // if(!this.MDL.size_label.which) {
      //   this.maxLabelTextSize = this.profileConstants.defaultLabelTextSize;
      //   this.MDL.size_label.set({'domainMax': (this.maxLabelTextSize - minLabelTextSize) / minMaxDelta, 'which': '_default'});
      //   return;
      // }
      if (extent[1] === null) {
        this.minLabelTextSize = this.maxLabelTextSize = this.profileConstants.defaultLabelTextSize;
      } else {
        this.minLabelTextSize = this.maxLabelTextSize;
      }
    }

    this.labelSizeTextScale.range([this.minLabelTextSize, this.maxLabelTextSize]);
  }

  updateSizeTextScale() {
    //scales
    if (this.MDL.size_label) {
      this.labelSizeTextScale = this.MDL.size_label.scale.d3Scale;
    }
  }
 
  _updateLayoutProfile(){
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
  }
 
  get closeCrossHeight() {
    this.services.layout.size;
    return this.profileConstants.closeCrossSize;
  }

  get defaultFontSize() {
    this.services.layout.size;
    return this.profileConstants.defaultLabelTextSize;
  }

  getFontSize(valueLST) {
    if (this.labelSizeTextScale) {
      if (valueLST || valueLST == 0) {
        const range = this.labelSizeTextScale.range();
        return range[0] + Math.sqrt((this.labelSizeTextScale(valueLST) - range[0]) * (range[1] - range[0]));
      }
    }
    return this.defaultFontSize;
  }
}


LabelSizeHelper.DEFAULT_UI = {
  offset: () => ({}),
  enabled: true,
  dragging: true,
  removeLabelBox: false
};

const decorated = decorate(LabelSizeHelper, {
  "MDL": computed,
  "defaultFontSize": computed,
  "closeCrossHeight": computed
});
export { decorated as LabelSizeHelper };