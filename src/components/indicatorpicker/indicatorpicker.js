import * as legacy_utils from "../../legacy/base/utils";
import * as Utils from "../../utils";
import { BaseComponent } from "../base-component";

import "./indicatorpicker.scss";

/*!
 * VIZABI INDICATOR PICKER
 * Reusable indicator picker component
 */

export class IndicatorPicker extends BaseComponent {
  constructor(config) {
    config.template = `
      <span class="vzb-ip-holder">
        <span class="vzb-ip-select"></span>
        <span class="vzb-ip-info"></span>
      </span>
    `;

    super(config);
  }

  setup(options) {
    this.targetProp = options.targetProp;
    this.submodel = options.submodel;
    this.submodelFunc = options.submodelFunc;
    this.showHoverValues = options.showHoverValues || false;

    this.DOM = {
      select: this.element.select(".vzb-ip-select"),
      info: this.element.select(".vzb-ip-info")
    };

    this.DOM.select.on("click", () => {
      const rect = this.DOM.select.node().getBoundingClientRect();
      const rootEl = this.root.element;
      const rootRect = rootEl.node().getBoundingClientRect();
      const treemenuComp = this.root.findChild({type: "TreeMenu"});
      const treemenuColWidth = treemenuComp.profileConstants.col_width;
      const treemenuWrapper = treemenuComp.element.select(".vzb-treemenu-wrap");
      const treemenuPaddLeft = parseInt(treemenuWrapper.style("padding-left"), 10) || 0;
      const treemenuPaddRight = parseInt(treemenuWrapper.style("padding-right"), 10) || 0;
      const topPos = rect.bottom - rootRect.top;
      const leftPos = rect.left - rootRect.left - (treemenuPaddLeft + treemenuPaddRight + treemenuColWidth - rect.width) * 0.5;

      if (this._isEncoding()) {
        treemenuComp
          .alignX("left")
          .alignY("top")
          .top(topPos)
          .left(leftPos)
          .encoding(this.targetProp)
          //.updateView()
          .toggle();
      }
    });

    //TODO: continue with Info
  }

  draw() {
    this.MDL = {
      model: this._getModel()
    };
    if (this.showHoverValues) {
      this.MDL.highlighted = this.model.encoding.highlighted;
    }

    this.localise = this.services.locale.auto();
    this.addReaction(this._updateView);
  }

  _getModel() {
    if (this.submodel === "encoding") {
      return this.model.encoding[this.targetProp];
    }
    if (!this.submodel && !this.submodelFunc) return this.model;
    return this.submodelFunc ? this.submodelFunc() : legacy_utils.getProp(this, this.submodel.split("."));
  }

  _updateView() {
    let selectText;

    if (this._isEncoding()) {
      if (this.MDL.model.data.isConstant) {
        const constant = this.MDL.model.data.constant;
        const scaleModelType = this.MDL.model.scale.config.modelType;
        selectText = this.localise("indicator/" + constant + (scaleModelType ? "/" + scaleModelType : ""));
      } else if (this.showHoverValues && this.MDL.highlighted.data.filter.any()) {
        const highlightedMarkers = this.MDL.highlighted.data.filter.markers;
        const [key, payload] = highlightedMarkers.entries().next().value;
        const hoverKey = (this.model.dataMap.getByStr(key) || (payload !== true && JSON.parse(payload)) || {})[this.targetProp];

        if (["entity_domain", "entity_set"].includes(this.MDL.model.data.conceptProps.concept_type)){
          // entity domain or set and may gave an extra model to resolve names from  
          if (this.state.hoverKeyLabels && this.state.hoverKeyLabels[hoverKey] != null)
            selectText = this.state.hoverKeyLabels[hoverKey];
          else
            selectText = this.localise(hoverKey);
        } else {        
          selectText = this.localise(hoverKey);
        }
          
      } else {
        selectText = Utils.getConceptShortName(this.MDL.model, this.localise);
      }
    }
    this.treemenu = this.root.findChild({type: "TreeMenu"});
    this.DOM.select
      .classed("vzb-disabled", this.treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .text(selectText);
  }

  _isEncoding() {
    return !!this.MDL.model.marker;
  }

  _setModel(value) {
    this.MDL.model[this.checkbox] = value;
  }

}
