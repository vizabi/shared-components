import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import {decorate, observable, computed, runInAction} from "mobx";
import "./errormessage.scss";

import { ICON_ELLIPSIS_V, ICON_CLOSE } from "../../icons/iconset.js";


let hidden = true;
class _ErrorMessage extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-errormessage-background"></div>
      <div class="vzb-errormessage-box">
        <div class="vzb-errormessage-hero">🙄</div>
        <div class="vzb-errormessage-title"></div>
        <div class="vzb-errormessage-body vzb-dialog-scrollable">
          <div class="vzb-errormessage-message"></div>
          <pre class="vzb-errormessage-details"></pre>
        </div>
      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {
      background: this.element.select(".vzb-errormessage-background"),
      container: this.element.select(".vzb-errormessage-box"),
      close: this.element.select(".vzb-errormessage-close"),
      hero: this.element.select(".vzb-errormessage-hero"),
      title: this.element.select(".vzb-errormessage-title"),
      message: this.element.select(".vzb-errormessage-message"),
      details: this.element.select(".vzb-errormessage-details")
    };
    
    this.element.classed("vzb-hidden", true);
  }

  get MDL(){
    return {
      frame: this.model.encoding.frame
    };
  }

  toggle(arg) {
    if (arg == null) arg = !hidden;
    hidden = arg;
    this.element.classed("vzb-hidden", hidden);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", c != this && !hidden);
    });
  }

  error(err){
    const localise = this.services.locale.status == "fulfilled"?
      this.services.locale.auto()
      : nop => nop;
    this.DOM.title.text(localise(err.name));
    this.DOM.message.text(err.message);
    this.DOM.details.text(JSON.stringify(err.details, null, 2));
    this.toggle(false);
  }
}


_ErrorMessage.DEFAULT_UI = {
};

//export default BubbleChart;
export const ErrorMessage = decorate(_ErrorMessage, {
  "MDL": computed
});