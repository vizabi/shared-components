import { Dialog } from "../dialog";
import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { MinMaxInputs } from "../../minmaxinputs/minmaxinputs";

/*
 * Axes dialog
 */

export class Axes extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="axes" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="axes" data-click="dragDialog"></span>
        <div class="vzb-dialog-title">
          <span data-localise="buttons/axes"></span>
        </div>
        <div class="vzb-dialog-content">
          <p class="vzb-dialog-sublabel">
            <span data-localise="buttons/x"></span>
            <span class="vzb-xaxis-selector"></span>
          </p>
          <div class="vzb-xaxis-minmax vzb-dialog-paragraph"></div>
          <p class="vzb-dialog-sublabel">
            <span data-localise="buttons/y"></span>
            <span class="vzb-yaxis-selector"></span>
          </p>
          <div class="vzb-yaxis-minmax vzb-dialog-paragraph"></div>
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
      placeholder: ".vzb-xaxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "x"
      }
    },{
      type: MinMaxInputs,
      placeholder: ".vzb-xaxis-minmax",
      state: {
        submodel: "encoding.x.scale"
      }
    },{
      type: IndicatorPicker,
      placeholder: ".vzb-yaxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "y"
      }
    },{
      type: MinMaxInputs,
      placeholder: ".vzb-yaxis-minmax",
      state: {
        submodel: "encoding.y.scale"
      }
    }]

    super(config);
  }

}

Dialog.add("axes", Axes);




const _Axes = {

  /**
   * Initializes the dialog component
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, parent) {
    this.name = "axes";
    const _this = this;

    this.components = [{
      component: indicatorpicker,
      placeholder: ".vzb-xaxis-selector",
      model: ["state.time", "state.marker.axis_x", "locale"]
    }, {
      component: minmaxinputs,
      placeholder: ".vzb-xaxis-minmax",
      model: ["state.marker", "state.time", "locale"],
      markerID: "axis_x",
      ui: {
        selectDomainMinMax: false,
        selectZoomedMinMax: true
      }
    }, {
      component: indicatorpicker,
      placeholder: ".vzb-yaxis-selector",
      model: ["state.time", "state.marker.axis_y", "locale"]
    }, {
      component: minmaxinputs,
      placeholder: ".vzb-yaxis-minmax",
      model: ["state.marker", "state.time", "locale"],
      markerID: "axis_y",
      ui: {
        selectDomainMinMax: false,
        selectZoomedMinMax: true
      }
    }];

    this._super(config, parent);
  }
}
