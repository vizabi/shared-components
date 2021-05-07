import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";

import "./minmaxinputs.scss";
/*!
 * VIZABI MIN MAX INPUT FIELDS
 */

const DOMAIN = "domain";
const ZOOMED = "zoomed";
const MIN = 0;
const MAX = 1;

export class MinMaxInputs extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-mmi-holder">

        <span class="vzb-mmi-domainmin-label"></span>
        <input type="text" class="vzb-mmi-domainmin" name="min">
        <span class="vzb-mmi-domainmax-label"></span>
        <input type="text" class="vzb-mmi-domainmax" name="max">

        <br class="vzb-mmi-break"/>

        <span class="vzb-mmi-zoomedmin-label"></span>
        <input type="text" class="vzb-mmi-zoomedmin" name="min">
        <span class="vzb-mmi-zoomedmax-label"></span>
        <input type="text" class="vzb-mmi-zoomedmax" name="max">

      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {
      domain_labelMin: this.element.select(".vzb-mmi-domainmin-label"),
      domain_labelMax: this.element.select(".vzb-mmi-domainmax-label"),
      domain_fieldMin: this.element.select(".vzb-mmi-domainmin"),
      domain_fieldMax: this.element.select(".vzb-mmi-domainmax"),
      break: this.element.select(".vzb-mmi-break"),
      zoomed_labelMin: this.element.select(".vzb-mmi-zoomedmin-label"),
      zoomed_labelMax: this.element.select(".vzb-mmi-zoomedmax-label"),
      zoomed_fieldMin: this.element.select(".vzb-mmi-zoomedmin"),
      zoomed_fieldMax: this.element.select(".vzb-mmi-zoomedmax")
    };

    const _this = this;

    this.DOM.domain_fieldMin.on("change", function() {
      _this._setModel(DOMAIN, MIN, this.value);
    });
    this.DOM.domain_fieldMax.on("change", function() {
      _this._setModel(DOMAIN, MAX, this.value);
    });

    this.DOM.zoomed_fieldMin.on("change", function() {
      _this._setModel(ZOOMED, MIN, this.value);
    });
    this.DOM.zoomed_fieldMax.on("change", function() {
      _this._setModel(ZOOMED, MAX, this.value);
    });

    this.element.selectAll("input")
      .on("keypress", () => {
        if (d3.event.which == 13) document.activeElement.blur();
      });

  }

  draw() {
    this.MDL = {
      model: this._getModel()
    };

    this.localise = this.services.locale.auto();

    const _this = this;
    this.formatter = function(n) {
      if (!n && n !== 0) return n;
      if (utils.isDate(n)) return _this.localise(n);
      return d3.format(".2r")(n);
    };

    this.addReaction(this._updateView);

  }

  _updateView() {
    this.DOM.domain_labelMin.text(this.localise("hints/min") + ":");
    this.DOM.domain_labelMax.text(this.localise("hints/max") + ":");
    this.DOM.zoomed_labelMin.text(this.localise("hints/min") + ":");
    this.DOM.zoomed_labelMax.text(this.localise("hints/max") + ":");

    this.DOM.domain_labelMin.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.DOM.domain_labelMax.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.DOM.domain_fieldMin.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.DOM.domain_fieldMax.classed("vzb-hidden", !this.ui.selectDomainMinMax);

    this.DOM.break.classed("vzb-hidden", !(this.ui.selectDomainMinMax && this.ui.selectZoomedMinMax));

    this.DOM.zoomed_labelMin.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.DOM.zoomed_labelMax.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.DOM.zoomed_fieldMin.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.DOM.zoomed_fieldMax.classed("vzb-hidden", !this.ui.selectZoomedMinMax);

    const {
      domain,
      zoomed
    } = this.MDL.model;
    this.DOM.domain_fieldMin.property("value", this.formatter(d3.min(domain)));
    this.DOM.domain_fieldMax.property("value", this.formatter(d3.max(domain)));
    this.DOM.zoomed_fieldMin.property("value", this.formatter(d3.min(zoomed)));
    this.DOM.zoomed_fieldMax.property("value", this.formatter(d3.max(zoomed)));
  }

  _getModel() {
    if (this.state.submodel) {
      const submodel = this.state.submodel.split(".");
      if (submodel[0] === "encoding") {
        return utils.getProp(this.model.encoding[submodel[1]], submodel.slice(2));
      }
    }
    if (!this.state.submodel && !this.state.submodelFunc) return this.model;
    return this.state.submodelFunc ? this.state.submodelFunc() : utils.getProp(this, this.state.submodel.split("."));
  }

  _setModel(what, index, value) {
    const newWhatArray = this.MDL.model[what].slice(0);
    newWhatArray[index] = value;
    this.MDL.model.config[what] = newWhatArray;
  }
}

MinMaxInputs.DEFAULT_UI = {
  selectDomainMinMax: false,
  selectZoomedMinMax: true
};
