import * as utils from "base/utils";
import { Dialog } from "../dialog";
import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";

/*!
 * VIZABI COLOR DIALOG
 */

export class Colors extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="colors" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="colors" data-click="dragDialog"></span>
        
        <div class="vzb-dialog-title">
          <span data-localise="buttons/colors"></span>
          <span class="vzb-caxis-selector"></span>
        </div>
      
        <div class="vzb-dialog-content vzb-dialog-scrollable">
          <div class="vzb-clegend-container">
            <svg>
              <g class="vzb-timedisplay"></g>
            </svg>
          </div>
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
      placeholder: ".vzb-caxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "color",
        showHoverValues: true
      },
      //model: config.root.model.stores.markers.get("legend")
    }]
    
    super(config);
  }

}

Dialog.add("colors", Colors);


const _Colors = {

  /**
   * Initializes the dialog component
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, parent) {
    this.name = "colors";

    this.components = [{
      component: indicatorpicker,
      placeholder: ".vzb-caxis-selector",
      model: ["state.time", "state.marker.color", "locale"],
      showHoverValues: true
    }, {
      component: colorlegend,
      placeholder: ".vzb-clegend-container",
      model: ["state.time", "state.entities", "state.marker", "state.marker.color", "locale", "ui"]
    }];


    this._super(config, parent);
  }

};
