import { Dialog } from "../dialog";
import { SimpleCheckbox } from "../../simplecheckbox/simplecheckbox";
/*
 * Size dialog
 */

export class Presentation extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="dialogs/presentation"></span>
        </div>

        <div class="vzb-dialog-content">
          <div class="vzb-presentationmode-switch"></div>
          <div class="vzb-decorations-switch"></div>
          <div class="vzb-time-background-switch"></div>
          <div class="vzb-time-trails-switch"></div>
          <div class="vzb-format-si-prefix-switch"></div>
        </div>

      </div>
    `;

    config.subcomponents = [{
      type: SimpleCheckbox,
      placeholder: ".vzb-presentationmode-switch",
      options: {
        checkbox: "projector",
        submodel: "services.layout"
      }
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-decorations-switch",
      options: {
        checkbox: "enabled",
        prefix: "decorations",
        submodel: "root.ui.chart.decorations"
      }
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-time-background-switch",
      options: {
        checkbox: "timeInBackground",
        submodel: "root.ui.chart"
      }
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-time-trails-switch",
      options: {
        checkbox: "timeInTrails",
        submodel: "root.ui.chart"
      }
    }, {
      type: SimpleCheckbox,
      placeholder: ".vzb-format-si-prefix-switch",
      options: {
        checkbox: "numberFormatSIPrefix",
        submodel: "root.ui.chart"
      }
    }];

    super(config);
  }


}

Dialog.add("presentation", Presentation);
