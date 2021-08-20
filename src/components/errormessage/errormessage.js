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
          <div class="vzb-errormessage-expand"></div>
          <pre class="vzb-errormessage-details vzb-hidden"></pre>
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
      expand: this.element.select(".vzb-errormessage-expand"),
      details: this.element.select(".vzb-errormessage-details")
    };
    
    this.element.classed("vzb-hidden", true);
    this.DOM.background.on("click", () => {
      this.toggle(true);
    });
    this.DOM.expand.on("click", () => {
      this.DOM.details.classed("vzb-hidden", !this.DOM.details.classed("vzb-hidden"))
    });
  }

  get MDL(){
    return {
      frame: this.model.encoding.frame
    };
  }

  //this is a hack because MobX autorun onError would eat the error rethrowing from there doesn't help
  rethrow(err){
      throw new Error("new rethrow");
    setTimeout(function(){
      throw("ERROR REACHED USER");
    }, 1)
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
    //if(!hidden) return console.warn("errorMessage: skipping action because already in error");

    const localise = this.services.locale.status == "fulfilled"?
      this.services.locale.auto()
      : nop => nop;

    this.DOM.title.text(localise(err.name));
    this.DOM.message.text(localise(err.message));

    this.DOM.expand
      .style("display", err.details ? "block" : "none")
      .html(localise("crash/expand"));

    this.DOM.details
      .style("display", err.details ? "block" : "none")
      .text(JSON.stringify(err.details, null, 2));

    this.toggle(false);

    this.rethrow(err);
  }
}


_ErrorMessage.DEFAULT_UI = {
};

//export default BubbleChart;
export const ErrorMessage = decorate(_ErrorMessage, {
  "MDL": computed
});