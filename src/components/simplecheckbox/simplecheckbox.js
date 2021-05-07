import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";

import "./simplecheckbox.scss";

const OPTIONS = {
  checkbox: null,
  setCheckboxFunc: null,
  submodel: null,
  submodelFunc: null,
  prefix: "",
};

export class SimpleCheckbox extends BaseComponent {
  constructor(config) {
    config.template = `
      <span class="vzb-sc-holder vzb-dialog-checkbox"><input type="checkbox"><label></label></span>    
    `;
    super(config);
  }

  setup(_options) {
    this.DOM = {
      check: this.element.select("input"),
      label: this.element.select("label")
    };
    
    const options = this.options = utils.deepExtend(utils.deepExtend({}, OPTIONS), _options || {});

    const _this = this;

    const id = "-check-" + this.id;
    this.DOM.label.attr("for", id);
    this.DOM.check.attr("id", id)
      .on("change", function() {
        _this._setModel(d3.select(this).property("checked"));
      });

  }

  draw() {
    this.MDL = {
      model: this._getModel()
    };

    this.localise = this.services.locale.auto();
    this.addReaction(this._updateView);
  }

  _getModel() {
    const {
      submodel,
      submodelFunc
    } = this.options;
    
    if (!submodel && !submodelFunc) return this.model;
    return submodelFunc ? submodelFunc() : utils.getProp(this, submodel.split("."));
  }

  _updateView() {
    const model = this.MDL.model;
    const {
      checkbox,
      prefix
    } = this.options;
    const modelExists = model && (model[checkbox] || model[checkbox] === false);

    this.DOM.label.classed("vzb-hidden", !modelExists);
    if (modelExists) {
      this.DOM.label.text(this.localise("check/" + (prefix ? prefix + "/" : "") + checkbox));
      this.DOM.check.property("checked", !!model[checkbox]);
    }
  }

  _setModel(value) {
    if (this.options.setCheckboxFunc) {
      this.MDL.model[this.options.setCheckboxFunc](value);
    } else {
      this.MDL.model[this.options.checkbox] = value;
    }
  }

}
