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

  setup(_options) {
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
    }

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
    }

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
        return utils.getProp(this.model.encoding.get(submodel[1]), submodel.slice(2));
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
}




const _MinMaxInputs = {

  /**
   * Initializes the Component.
   * Executed once before any template is rendered.
   * @param config The options passed to the component
   * @param context The component's parent
   */
  init(config, context) {

    this.name = "gapminder-minmaxinputs";
    this.template = require("./minmaxinputs.html");

    this.model_expects = [{
      name: "marker",
      type: "marker"
    }, {
      name: "time",
      type: "time"
    }, {
      name: "locale",
      type: "locale"
    }];

    this.markerID = config.markerID;
    if (!config.markerID) utils.warn("minmaxinputs.js complains on 'markerID' property: " + config.markerID);

    this.model_binds = {
      "translate:locale": () => {
        this.updateView();
      },

      [`change:marker.${this.markerID}`]: () => {
        this.updateView();
      },

      ready: () => {
        this.updateView();
      }
    };

    // contructor is the same as any component
    this._super(config, context);

    // SPECIFIC COMPONENT UI! NOT TOOLMODEL UI!
    this.ui = utils.extend({
      selectDomainMinMax: false,
      selectZoomedMinMax: false
    }, this.ui.getPlainObject());

  },

  ready() {
    this.updateView();
  },

  readyOnce() {
    const _this = this;

    this.element = d3.select(this.element);

    this.el_domain_labelMin = this.element.select(".vzb-mmi-domainmin-label");
    this.el_domain_labelMax = this.element.select(".vzb-mmi-domainmax-label");
    this.el_domain_fieldMin = this.element.select(".vzb-mmi-domainmin");
    this.el_domain_fieldMax = this.element.select(".vzb-mmi-domainmax");

    this.el_break = this.element.select(".vzb-mmi-break");

    this.el_zoomed_labelMin = this.element.select(".vzb-mmi-zoomedmin-label");
    this.el_zoomed_labelMax = this.element.select(".vzb-mmi-zoomedmax-label");
    this.el_zoomed_fieldMin = this.element.select(".vzb-mmi-zoomedmin");
    this.el_zoomed_fieldMax = this.element.select(".vzb-mmi-zoomedmax");


    _this.el_domain_fieldMin.on("change", function() {
      _this._setModel(DOMAINMIN, this.value);
    });
    _this.el_domain_fieldMax.on("change", function() {
      _this._setModel(DOMAINMAX, this.value);
    });

    _this.el_zoomed_fieldMin.on("change", function() {
      _this._setModel(ZOOMEDMIN, this.value);
    });
    _this.el_zoomed_fieldMax.on("change", function() {
      _this._setModel(ZOOMEDMAX, this.value);
    });

    this.element.selectAll("input")
      .on("keypress", () => {
        if (d3.event.which == 13) document.activeElement.blur();
      });
  },

  updateView() {
    const _this = this;
    this.translator = this.model.locale.getTFunction();

    this.el_domain_labelMin.text(this.translator("hints/min") + ":");
    this.el_domain_labelMax.text(this.translator("hints/max") + ":");
    this.el_zoomed_labelMin.text(this.translator("hints/min") + ":");
    this.el_zoomed_labelMax.text(this.translator("hints/max") + ":");

    this.el_domain_labelMin.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.el_domain_labelMax.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.el_domain_fieldMin.classed("vzb-hidden", !this.ui.selectDomainMinMax);
    this.el_domain_fieldMax.classed("vzb-hidden", !this.ui.selectDomainMinMax);

    this.el_break.classed("vzb-hidden", !(this.ui.selectDomainMinMax && this.ui.selectZoomedMinMax));

    this.el_zoomed_labelMin.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.el_zoomed_labelMax.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.el_zoomed_fieldMin.classed("vzb-hidden", !this.ui.selectZoomedMinMax);
    this.el_zoomed_fieldMax.classed("vzb-hidden", !this.ui.selectZoomedMinMax);

    const formatter = function(n) {
      if (!n && n !== 0) return n;
      if (utils.isDate(n)) return _this.model.time.formatDate(n);
      return d3.format(".2r")(n);
    };

    const marker = this.model.marker[this.markerID];
    const domain = marker.getScale().domain();

    this.el_domain_fieldMin.property("value", formatter(d3.min(domain)));
    this.el_domain_fieldMax.property("value", formatter(d3.max(domain)));
    this.el_zoomed_fieldMin.property("value", formatter(marker.getZoomedMin()));
    this.el_zoomed_fieldMax.property("value", formatter(marker.getZoomedMax()));
  },

  _setModel(what, value) {
    this.model.marker[this.markerID][what] = utils.strToFloat(value);
  }

}
