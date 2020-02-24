import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";

import "./simplecheckbox.scss";

export class SimpleCheckbox extends BaseComponent {
  constructor(config) {
    config.template = `
      <span class="vzb-sc-holder vzb-dialog-checkbox"><input type="checkbox"><label></label></span>    
    `;
    super(config);
  }

  setup(options) {
    const _this = this;
    this.checkbox = options.checkbox;
    this.submodel = options.submodel;
    this.submodelFunc = options.submodelFunc;
    this.prefix = options.prefix;

    const id = "-check-" + this.id;
    this.labelEl = this.element.select("label").attr("for", id);
    this.checkEl = this.element.select("input").attr("id", id)
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
    if (!this.submodel && !this.submodelFunc) return this.model;
    return this.submodelFunc ? this.submodelFunc() : utils.getProp(this, this.submodel.split("."));
  }

  _updateView() {
    const model = this.MDL.model;
    const modelExists = model && (model[this.checkbox] || model[this.checkbox] === false);
    this.labelEl.classed("vzb-hidden", !modelExists);
    if (modelExists) {
      this.labelEl.text(this.localise("check/" + (this.prefix ? this.prefix + "/" : "") + this.checkbox));
      this.checkEl.property("checked", !!model[this.checkbox]);
    }
  }

  _setModel(value) {
    this.MDL.model[this.checkbox] = value;
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
