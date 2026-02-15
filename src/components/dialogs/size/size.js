import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";

import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { BubbleSize } from "../../brushslider/bubblesize/bubblesize";
import { MinMaxInputs } from "../../minmaxinputs/minmaxinputs";
/*
 * Size dialog
 */

export class Size extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="size" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="size" data-click="dragDialog"></span>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/size"></span>
          <div class="vzb-dialog-bubblesize"></div>
          <span class="vzb-saxis-selector"></span>
          <div class="vzb-saxis-minmax vzb-dialog-paragraph"></div>
        </div>
        <div class="vzb-dialog-content">
          <span class="vzb-dialog-subtitle"></span>
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
      placeholder: ".vzb-saxis-selector",
      options: {
        submodel: "encoding",
        targetProp: "size",
        showHoverValues: true
      }
    },{
      type: MinMaxInputs,
      placeholder: ".vzb-saxis-minmax",
      state: {
        submodel: "encoding.size.scale"
      },
      options: {
        targetProp: "domain"
      }
    },{
      type: BubbleSize,
      placeholder: ".vzb-dialog-bubblesize",
      options: {
        showArcs: true,
        submodelFunc: () => this.model.encoding.size.scale,
      }
    }];

    super(config);
  }

  draw() {
    super.draw();

    this.addReaction(this._updateSubtitle);
  }

  _updateSubtitle() {
    const conceptProps = this.model.encoding.size.data.conceptProps;
    const subtitle = utils.getSubtitle(conceptProps?.name, conceptProps?.name_short);

    this.element.select(".vzb-dialog-subtitle").text(subtitle || "");
  }
}

Dialog.add("size", Size);
