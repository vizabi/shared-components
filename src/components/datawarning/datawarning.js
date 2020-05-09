import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import "./datawarning.scss";

import { ICON_WARN, ICON_CLOSE } from "../../icons/iconset.js";

let hidden = true;

export class DataWarning extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-data-warning-background"></div>
      <div class="vzb-data-warning-box">
        <div class="vzb-data-warning-link"></div>
        <div class="vzb-data-warning-title"></div>
        <div class="vzb-data-warning-body vzb-dialog-scrollable"></div>
      </div>
    `;

    super(config);
  }

  setup(options) {
    this.DOM = {
      background: this.element.select(".vzb-data-warning-background"),
      container: this.element.select(".vzb-data-warning-box"),
      icon: this.element.select(".vzb-data-warning-link"),
      close: this.element.select(".vzb-data-warning-close"),
      title: this.element.select(".vzb-data-warning-title"),
      body: this.element.select(".vzb-data-warning-body")
    }
    
    this.element.classed("vzb-hidden", true);

    this.DOM.background
      .on("click", () => {
        this.toggle(true);
      });

    this.DOM.container.append("div")
      .html(ICON_CLOSE)
      .on("click", () => {
        this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", "vzb-data-warning-close");

    this.DOM.icon.html(ICON_WARN)
      .append("div");
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.DOM.icon.select("div")
      .text(this.localise("hints/dataWarning"));

    const title = this.localise("datawarning/title/" + this.root.name);
    this.DOM.title.html(title)
      .classed("vzb-hidden", !title || title == ("datawarning/title/" + this.root.name));

    this.DOM.body.html(this.localise("datawarning/body/" + this.root.name));
  }

  toggle(arg) {
    if (arg == null) arg = !hidden;
    hidden = arg;
    this.element.classed("vzb-hidden", hidden);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", c != this && !hidden);
    });
  }
}



const _DataWarning = {

  init(config, context) {
    const _this = this;

    this.name = "gapminder-datawarning";

    this.model_expects = [{
      name: "locale",
      type: "locale"
    }];

    this.context = context;

    this.model_binds = {
      "translate:locale": function(evt) {
        if (!_this._ready) return;
        _this.redraw();
      }
    };

    //contructor is the same as any component
    this._super(config, context);
  },

  ready() {
    this.redraw();
  },

  readyOnce() {
    const _this = this;
    this.element = d3.select(this.placeholder);

    this.element.selectAll("div").remove();

    this.element.append("div")
      .attr("class", "vzb-data-warning-background")
      .on("click", () => {
        _this.toggle(true);
      });

    this.container = this.element.append("div")
      .attr("class", "vzb-data-warning-box");

    this.container.append("div")
      .html(iconClose)
      .on("click", () => {
        _this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", "vzb-data-warning-close");

    const icon = this.container.append("div")
      .attr("class", "vzb-data-warning-link")
      .html(iconWarn);

    icon.append("div");

    this.container.append("div")
      .attr("class", "vzb-data-warning-title");

    this.container.append("div")
      .attr("class", "vzb-data-warning-body vzb-dialog-scrollable");
  },

  redraw() {
    this.translator = this.model.locale.getTFunction();

    this.container.select(".vzb-data-warning-link div")
      .text(this.translator("hints/dataWarning"));

    const title = this.translator("datawarning/title/" + this.parent.name);
    this.container.select(".vzb-data-warning-title")
      .html(title)
      .classed("vzb-hidden", !title || title == ("datawarning/title/" + this.parent.name));

    this.container.select(".vzb-data-warning-body")
      .html(this.translator("datawarning/body/" + this.parent.name));
  },

  toggle(arg) {
    if (arg == null) arg = !hidden;
    hidden = arg;
    this.element.classed("vzb-hidden", hidden);

    const _this = this;
    this.parent.components.forEach(c => {
      c.element.classed("vzb-blur", c != _this && !hidden);
    });
  }

}
