import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";

import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { BubbleSize } from "../../brushslider/bubblesize/bubblesize";
/*
 * Size dialog
 */

export class Size extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="size" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="size" data-click="dragDialog"></span>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/size"></span>
          <span class="vzb-saxis-selector"></span>
        </div>
        <div class="vzb-dialog-content">
          <div class="vzb-dialog-bubblesize"></div>
          <span class="vzb-dialog-subtitle"></span>
        </div>
        <div class="vzb-dialog-buttons">
          <div data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>
      </div>    
    `;

    config.subcomponents = [{
      type: IndicatorPicker,
      placeholder: ".vzb-saxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "size",
        showHoverValues: true
      }
    },{
      type: BubbleSize,
      placeholder: ".vzb-dialog-bubblesize",
      options: {
        showArcs: true,
        submodelFunc: () => this.model.encoding.size.scale,
      }
    }];

    super(config);
  }

  draw() {
    super.draw();

    this.addReaction(this._updateSubtitle);
  }

  _updateSubtitle() {
    const conceptProps = this.model.encoding.size.data.conceptProps;
    const subtitle = utils.getSubtitle(conceptProps.name, conceptProps.name_short);

    this.element.select(".vzb-dialog-subtitle").text(subtitle);
  }
}

Dialog.add("size", Size);



const _Size = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "size";
    const _this = this;

    // in dialog, this.model_expects = ["state", "ui", "locale"];

    this.model_binds = {
      "change:state.marker.size.which": function(evt) {
        if (!_this._readyOnce) return;
        _this.updateSubtitle();
      },
      "translate:locale": function() {
        if (!_this._readyOnce) return;
        _this.updateSubtitle();
      }
    };

    this.components = [
      {
        component: indicatorpicker,
        placeholder: ".vzb-saxis-selector",
        model: ["state.time", "state.marker.size", "locale"],
        showHoverValues: true
      }
    ];

    // config.ui is same as this.model.ui here but this.model.ui is not yet available because constructor hasn't been called.
    // can't call constructor earlier because this.components needs to be complete before calling constructor
    if (!config.ui.chart || config.ui.chart.sizeSelectorActive !== 0) {
      this.components.push({
        component: bubblesize,
        placeholder: ".vzb-dialog-bubblesize",
        model: ["state.marker.size", "locale"],
        ui: {
          show_button: false
        }
      });
    }

    this._super(config, parent);
  },

  readyOnce() {
    this._super();
    this.updateSubtitle();
  },

  updateSubtitle() {
    const conceptProps = this.model.state.marker.size.getConceptprops();
    const subtitle = utils.getSubtitle(conceptProps.name, conceptProps.name_short);

    this.element.select(".vzb-dialog-subtitle").text(subtitle);
  }
}
