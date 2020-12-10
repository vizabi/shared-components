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
        checkbox: "decorations",
        submodel: "root.ui.chart"
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



const _Presentation = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "presentation";

    // in dialog, this.model_expects = ["state", "data"];

    this.components = [{
      component: simplecheckbox,
      placeholder: ".vzb-presentationmode-switch",
      model: ["ui", "locale"],
      checkbox: "presentation"
    }, {
      component: simplecheckbox,
      placeholder: ".vzb-decorations-switch",
      model: ["ui.chart.decorations", "locale"],
      checkbox: "enabled"
    }, {
      component: simplecheckbox,
      placeholder: ".vzb-time-background-switch",
      model: ["ui.chart", "locale"],
      checkbox: "timeInBackground"
    }, {
      component: simplecheckbox,
      placeholder: ".vzb-time-trails-switch",
      model: ["ui.chart", "locale"],
      checkbox: "timeInTrails"
    }, {
      component: simplecheckbox,
      placeholder: ".vzb-format-si-prefix-switch",
      model: ["ui", "locale"],
      checkbox: "numberFormatSIPrefix"
    }];

    this._super(config, parent);
  }
}
