import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";

/*
 * Size dialog
 */

export class Opacity extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/opacity"></span>
        </div>
            
        <div class="vzb-dialog-content">
          <p class="vzb-dialog-sublabel">
            <span data-localise="buttons/opacityRegular"></span>
          </p>
          <div class="vzb-dialog-bubbleopacity-regular"></div>

          <p class="vzb-dialog-sublabel">
            <span data-localise="buttons/opacityNonselect"></span>
          </p>
          <div class="vzb-dialog-bubbleopacity-selectdim"></div>
          </div>
        </div>

      </div>
    `;

    config.subcomponents = [{
      type: SingleHandleSlider,
      placeholder: ".vzb-dialog-bubbleopacity-regular",
      options: {
        value: "opacityRegular",
        submodel: "root.ui.chart"
      }
    },{
      type: SingleHandleSlider,
      placeholder: ".vzb-dialog-bubbleopacity-selectdim",
      options: {
        value: "opacitySelectDim",
        submodel: "root.ui.chart"
      }
    }];

    super(config);
  }
}

Dialog.add("opacity", Opacity);






const _Opacity = {

  /**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "opacity";

    // in dialog, this.model_expects = ["state", "data"];

    this.components = [
      {
        component: singlehandleslider,
        placeholder: ".vzb-dialog-bubbleopacity-regular",
        model: ["state.marker", "locale"],
        arg: "opacityRegular"
      }, {
        component: singlehandleslider,
        placeholder: ".vzb-dialog-bubbleopacity-selectdim",
        model: ["state.marker", "locale"],
        arg: "opacitySelectDim"
      }
    ];

    this._super(config, parent);
  }
};