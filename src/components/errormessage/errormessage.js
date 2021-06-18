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
        <div class="vzb-errormessage-title"></div>
        <div class="vzb-errormessage-body vzb-dialog-scrollable"></div>
      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {
      background: this.element.select(".vzb-errormessage-background"),
      container: this.element.select(".vzb-errormessage-box"),
      close: this.element.select(".vzb-errormessage-close"),
      title: this.element.select(".vzb-errormessage-title"),
      body: this.element.select(".vzb-errormessage-body")
    };
    
    this.element.classed("vzb-hidden", hidden);
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

  error(){
    this.localise = this.services.locale.auto();
    const err = {
      name: "error name",
      message: "error message"
    };
    this.DOM.title.text(err.name);
    this.DOM.body.text(err.message);
    this.toggle(false);
  }
}


_ErrorMessage.DEFAULT_UI = {
};

//export default BubbleChart;
export const ErrorMessage = decorate(_ErrorMessage, {
  "MDL": computed
});