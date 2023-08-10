import * as utils from "../../../legacy/base/utils.js";
import { BaseComponent } from "../../base-component.js";

const DEFAULTS = {
  name: "Test"
};

export class MarkerControlsSection extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class = "vzb-markercontrols-section"></div>
      <div class = "vzb-header">
        <span class = "vzb-title"></span>
        <span class = "vzb-threedots"></span>
        <span class = "vzb-enterhint"></span>
      </div>
    `;
    super(config);
  }

  setup(_options) {
    this.DOM = {
      title: this.element.select("vzb-title"),
    };
    
    this.options = utils.deepExtend(utils.deepExtend({}, DEFAULTS), _options || {});

    this.DOM.title.text(this.options.name);

  }

  draw() {
  }


}
