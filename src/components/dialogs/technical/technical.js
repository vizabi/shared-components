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
          <div class="vzb-advancedmarkerspace-switch"></div>
          <div class="vzb-showdatasources-switch"></div>
        </div>

      </div>
    `;

    config.subcomponents = [{
    //   type: SimpleCheckbox,
    //   placeholder: ".vzb-advancedshowandselect-switch",
    //   options: {
    //     checkbox: "enableSelectShowSwitch",
    //     submodelFunc: () => this.root
    //       .findChild({name: "dialogs"})
    //       .findChild({name: "find"}).ui
    //   }
    // },{
    //   type: SimpleCheckbox,
    //   placeholder: ".vzb-advancedmarkerspace-switch",
    //   options: {
    //     checkbox: "enableMarkerSpaceOptions",
    //     submodelFunc: () => this.root
    //       .findChild({name: "dialogs"})
    //       .findChild({name: "find"}).ui
    //   }
    // },{
      type: SimpleCheckbox,
      placeholder: ".vzb-showdatasources-switch",
      options: {
        checkbox: "showDataSources",
        submodelFunc: () => this.root
          .findChild({name: "tree-menu"}).ui
      }
    }];

    super(config);
  }

}

Dialog.add("technical", Technical);
