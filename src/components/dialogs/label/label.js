import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";

import sizeslider from "components/brushslider/sizeslider/sizeslider";
import indicatorpicker from "components/indicatorpicker/indicatorpicker";
import simplecheckbox from "components/simplecheckbox/simplecheckbox";
import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { SizeSlider } from "../../brushslider/sizeslider/sizeslider";
import { SimpleCheckbox } from "../../simplecheckbox/simplecheckbox";
/*
 * Label dialog
 */

export class Label extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="label" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="label" data-click="dragDialog"></span>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/label"></span>
        </div>

        <div class="vzb-dialog-content">
          <span class="vzb-saxis-selector"></span>
          <div class="vzb-dialog-sizeslider"></div>
          <div class="vzb-removelabelbox-switch"></div>
        </div>

        <div class="vzb-dialog-buttons">
          <div data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>

      </div>
    `;

    config.subcomponents = [{
      type: SizeSlider,
      placeholder: ".vzb-dialog-sizeslider",
      options: {
        constantUnit: "unit/pixels",
        submodelFunc: () => this.model.encoding.get("size_label").scale,
      }
    }, {
      type: IndicatorPicker,
      placeholder: ".vzb-saxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "size_label",
      }
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-removelabelbox-switch",
      options: {
        checkbox: "removeLabelBox",
        submodel: "root.ui.chart.labels"
      }
    }];

    super(config);
  }
}

Dialog.add("label", Label);

const _Label = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "label";

    // in dialog, this.model_expects = ["state", "data"];

    this.components = [
      {
        component: sizeslider,
        placeholder: ".vzb-dialog-sizeslider",
        model: ["state.marker.size_label",  "locale"],
        propertyname: "LabelTextSize",
        ui: {
          constantUnit: "unit/pixels"
        }
      },
      {
        component: indicatorpicker,
        placeholder: ".vzb-saxis-selector",
        model: ["state.time", "state.marker.size_label", "locale"],
        showHoverValues: true
      },
      {
        component: simplecheckbox,
        placeholder: ".vzb-removelabelbox-switch",
        model: ["ui.chart", "locale"],
        checkbox: "removeLabelBox",
        submodel: "labels"
      }
    ];

    this._super(config, parent);
  }
}
