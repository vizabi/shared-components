import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";

import { IndicatorPicker } from "../../indicatorpicker/indicatorpicker";
import { BubbleSize } from "../../brushslider/bubblesize/bubblesize";
import { MinMaxInputs } from "../../minmaxinputs/minmaxinputs";
/*
 * Size dialog
 */

export class Size extends Dialog {
  static DEFAULT_UI = {
    showSlidersWhenInSidebar: false
  };

  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="size" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="size" data-click="dragDialog"></span>
        <div class="vzb-dialog-bubblesize"></div>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/size"></span>
          <span class="vzb-saxis-selector"></span>
        </div>
        <div class="vzb-dialog-content">
          <span class="vzb-dialog-subtitle"></span>
          <div class="vzb-saxis-minmax vzb-dialog-paragraph"></div>
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
    this.addReaction(this._updateShowSlidersInSidebar);
  }

  _updateShowSlidersInSidebar() {
    const show = this.ui.showSlidersWhenInSidebar;
    this.element.classed("vzb-force-show-sliders", show);
    if (show) {
      //force layout size update so that BubbleSize's draw() autorun
      //re-runs now that its container is no longer display:none

      this.findChild({type: "BubbleSize"}).updateSize();
      //this.services.layout._resizeHandler();
    }
  }

  _updateSubtitle() {
    const conceptProps = this.model.encoding.size.data.conceptProps;
    const subtitle = utils.getSubtitle(conceptProps?.name, conceptProps?.name_short);

    this.element.select(".vzb-dialog-subtitle").text(subtitle || "");
  }
}

Dialog.add("size", Size);
