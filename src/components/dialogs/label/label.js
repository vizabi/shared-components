import { Dialog } from "../dialog";

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
          <div class="vzb-enablelabelbox-switch"></div>
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
        submodelFunc: () => this.model.encoding.size_label.scale,
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
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-enablelabelbox-switch",
      options: {
        checkbox: "enabled",
        submodel: "root.ui.chart.labels"
      }
    }];

    super(config);
  }
}

Dialog.add("label", Label);
