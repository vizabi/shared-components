import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";

import "./simplecheckbox.scss";

const OPTIONS = {
  checkbox: null,
  setCheckboxFunc: null,
  submodel: null,
  submodelFunc: null,
  prefix: "",
}

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
    }
    
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
    }

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



const _SimpleCheckbox = {

  init(config, context) {
    this.template =
      '<span class="vzb-sc-holder vzb-dialog-checkbox"><input type="checkbox"><label></label></span>';
    const _this = this;
    this.name = "gapminder-simplecheckbox";

    this.checkbox = config.checkbox;
    this.submodel = config.submodel;
    this.prefix = config.prefix;

    this.model_expects = [{
      name: "mdl"
      //TODO: learn how to expect model "axis" or "size" or "color"
    }, {
      name: "locale",
      type: "locale"
    }];


    this.model_binds = {
      "change:mdl": function(evt) {
        _this.updateView();
      },
      "translate:locale": function(evt) {
        _this.updateView();
      }
    };

    const submodel = (this.submodel) ? this.submodel + ":" : "";
    this.model_binds["change:mdl." + submodel + this.checkbox] = function() {
      _this.updateView();
    };

    //contructor is the same as any component
    this._super(config, context);
  },

  ready() {
    this.parentModel = (this.submodel) ? this.model.mdl[this.submodel] : this.model.mdl;
    this.updateView();
  },

  readyOnce() {
    const _this = this;
    this.element = d3.select(this.element);
    const id = "-check-" + _this._id;
    this.labelEl = this.element.select("label").attr("for", id);
    this.checkEl = this.element.select("input").attr("id", id)
      .on("change", function() {
        _this._setModel(d3.select(this).property("checked"));
      });
  },

  updateView() {
    this.translator = this.model.locale.getTFunction();
    const modelExists = this.parentModel && (this.parentModel[this.checkbox] || this.parentModel[this.checkbox] === false);
    this.labelEl.classed("vzb-hidden", !modelExists);
    if (modelExists) {
      this.labelEl.text(this.translator("check/" + (this.prefix ? this.prefix + "/" : "") + this.checkbox));
      this.checkEl.property("checked", !!this.parentModel[this.checkbox]);
    }
  },

  _setModel(value) {
    this.parentModel[this.checkbox] = value;
  }

};
