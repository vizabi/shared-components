import { Dialog } from "../dialog";
import { SimpleCheckbox } from "../../simplecheckbox/simplecheckbox";

export class Technical extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="dialogs/technical"></span>
        </div>

        <div class="vzb-dialog-content">
          <div class="vzb-advancedshowandselect-switch"></div>
        </div>

      </div>
    `;

    config.subcomponents = [{
      type: SimpleCheckbox,
      placeholder: ".vzb-advancedshowandselect-switch",
      options: {
        checkbox: "enableSelectShowSwitch",
        submodelFunc: () => this.root
          .findChild({name: "dialogs"})
          .findChild({name: "find"}).ui
      }
    }];

    super(config);
  }

}

Dialog.add("technical", Technical);




const _Technical = {

  /**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "technical";

    this.components = [{
      component: simplecheckbox,
      placeholder: ".vzb-advancedshowandselect-switch",
      model: ["ui.dialogs.dialog.find", "locale"],
      checkbox: "enableSelectShowSwitch"
    }];

    this._super(config, parent);
  }
};
