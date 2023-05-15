import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import {decorate, computed} from "mobx";
import * as d3 from "d3";

import "./minmaxinputs.scss";
/*!
 * VIZABI MIN MAX INPUT FIELDS
 */
class MinMaxInputs extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-mmi-holder">

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
      zoomed_labelMin: this.element.select(".vzb-mmi-zoomedmin-label"),
      zoomed_labelMax: this.element.select(".vzb-mmi-zoomedmax-label"),
      zoomed_fieldMin: this.element.select(".vzb-mmi-zoomedmin"),
      zoomed_fieldMax: this.element.select(".vzb-mmi-zoomedmax")
    };

    this.DOM.zoomed_fieldMin.on("change", this._setModel.bind(this));
    this.DOM.zoomed_fieldMax.on("change", this._setModel.bind(this));

    this.element.selectAll("input")
      .on("keypress", (event) => {
        if (event.which == 13) document.activeElement.blur();
      });

  }

  get MDL() {
    return {
      model: this._getModel()
    };
  }

  draw() {
    this.localise = this.services.locale.auto();

    const _this = this;
    this.formatter = function(n) {
      if (!n && n !== 0) return n;
      if (utils.isDate(n)) return _this.localise(n);
      if (this.MDL.model.type === "time") return n;
      return d3.format(".2r")(n);
    };

    this.addReaction(this._updateView);

  }

  _updateView() {
    this.DOM.zoomed_labelMin.text(this.localise("hints/min") + ":");
    this.DOM.zoomed_labelMax.text(this.localise("hints/max") + ":");

    this.DOM.zoomed_fieldMin.property("value", this.formatter(this.MDL.model.zoomed[0]));
    this.DOM.zoomed_fieldMax.property("value", this.formatter(this.MDL.model.zoomed[1]));
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

  _setModel() {
    const valueMin = this.DOM.zoomed_fieldMin.property("value");
    const valueMax = this.DOM.zoomed_fieldMax.property("value");
    let values = [valueMin, valueMax].map(m => m.replace("−", "-")); //replace the bourjois minus sign &#8722 to the proletarian &#45
    if (!this.MDL.model.type === "time") 
      values = values.map(m => parseFloat(m)); //replace the bourjois minus sign &#8722 to the proletarian &#45

    if(values.some(f => !f && f!==0)) {
      this._updateView();
    } else {
      this.MDL.model.config.zoomed = values;
    }
  }
}

MinMaxInputs.DEFAULT_UI = {
};

const decorated = decorate(MinMaxInputs, {
  "MDL": computed
});

export { decorated as MinMaxInputs };