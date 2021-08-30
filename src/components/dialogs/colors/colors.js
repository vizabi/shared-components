import { Dialog } from "../dialog";
import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { STATUS } from "../../../utils.js";
import { ColorLegend } from "../../colorlegend/colorlegend";

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
      state: {
        get hoverKeyLabels() {
          const legendMarker = config.root.model.markers?.legend;
          if (!legendMarker) return null;
          if (legendMarker.state === STATUS.READY) {
            //TODO: fix on multi dimensions config
            const labelKey = legendMarker.data.space[0];
            return legendMarker.dataArray.reduce((labels, data) => {
              labels[data[labelKey]] = data.name;
              return labels;
            }, {});
          }
          
          return null;
        }
      }
    }, {
      type: ColorLegend,
      placeholder: ".vzb-clegend-container",
      options: {
        colorModelName: "color",
        legendModelName: config.root.options.legendMarkerName || "legend"
      }
    }];
    
    super(config);
  }

}

Dialog.add("colors", Colors);
