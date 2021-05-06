import * as legacy_utils from "../../legacy/base/utils";
import * as Utils from "../../utils";
import { BaseComponent } from "../base-component";
import { ICON_QUESTION as iconQuestion } from "../../icons/iconset"

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
    }

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
    }
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
      if (this.MDL.model.data.isConstant()) {
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

const _IndPicker = {

  /**
     * Initializes the Indicator Picker.
     * Executed once before any template is rendered.
     * @param config The options passed to the component
     * @param context The component's parent
     */
  init(config, context) {

    this.name = "gapminder-indicatorpicker";
    this.template = '<span class="vzb-ip-holder"><span class="vzb-ip-select"></span><span class="vzb-ip-info"></span></span>';

    const _this = this;

    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "targetModel"
    }, {
      name: "locale",
      type: "locale"
    }];

    //this.markerID = config.markerID;
    this.showHoverValues = config.showHoverValues || false;
    //if (!config.markerID) utils.warn("indicatorpicker.js complains on 'markerID' property: " + config.markerID);

    this.model_binds = {
      "translate:locale": function(evt) {
        _this.updateView();
      },
      "ready": function(evt) {
        _this.updateView();
      }
    };

    this.model_binds["change:targetModel"] = function(evt, path) {
      if (path.indexOf("." + _this.targetProp) == -1) return;
      _this.updateView();
    };

    //contructor is the same as any component
    this._super(config, context);

    if (this.model.targetModel.isHook() && this.showHoverValues) {
      this.model.targetModel._parent.on("change:highlight", (evt, values) => {
        const mdl = _this.model.targetModel;
        if (!mdl.isHook()) return;
        const marker = mdl._parent;
        if (!_this.showHoverValues || mdl.use == "constant") return;
        const _highlightedEntity = marker.getHighlighted();
        if (_highlightedEntity.length > 1) return;

        if (_highlightedEntity.length) {
          marker.getFrame(_this.model.time.value, frame => {
            if (_this._highlighted || !frame) return;

            const _highlightedEntity = marker.getHighlighted();
            if (_highlightedEntity.length) {
              const KEYS = mdl.getDataKeys();
              let value = frame[mdl._name][legacy_utils.getKey(_highlightedEntity[0], KEYS)];

              // resolve strings via the color legend model
              const conceptType = mdl.getConceptprops().concept_type;
              if (value && mdl._type === "color" && ["entity_set", "entity_domain"].includes(conceptType)) {
                const clModel = mdl.getColorlegendMarker();
                if (clModel.label.getItems()[value]) value = clModel.label.getItems()[value];
              }

              _this._highlightedValue = value;

              _this._highlighted = (!_this._highlightedValue && _this._highlightedValue !== 0) || mdl.use !== "constant";
              _this.updateView();
            }
          });
        } else {
          if (values !== null && values !== "highlight") {
            if (values) {
              _this._highlightedValue = values[mdl._name];
              _this._highlighted = (!_this._highlightedValue && _this._highlightedValue !== 0) || mdl.use !== "constant";
            }
          } else {
            _this._highlighted = false;
          }
          _this.updateView();
        }
      });
    }

    this.targetProp = config.targetProp
      || this.model.targetModel instanceof Hook ? "which"
      : (this.model.targetModel instanceof Entities ? "dim"
        : (this.model.targetModel instanceof Marker ? "space"
          : null));
  },

  ready() {
    this.updateView();
  },

  readyOnce() {
    const _this = this;

    this.el_select = d3.select(this.element).select(".vzb-ip-select");

    this.el_select.on("click", () => {
      const rect = _this.el_select.node().getBoundingClientRect();
      const rootEl = _this.root.element instanceof Array ? _this.root.element : d3.select(_this.root.element);
      const rootRect = rootEl.node().getBoundingClientRect();
      const treemenuComp = _this.root.findChildByName("gapminder-treemenu");
      const treemenuColWidth = treemenuComp.activeProfile.col_width;
      const treemenuPaddLeft = parseInt(treemenuComp.wrapper.style("padding-left"), 10) || 0;
      const treemenuPaddRight = parseInt(treemenuComp.wrapper.style("padding-right"), 10) || 0;
      const topPos = rect.bottom - rootRect.top;
      const leftPos = rect.left - rootRect.left - (treemenuPaddLeft + treemenuPaddRight + treemenuColWidth - rect.width) * 0.5;

      treemenuComp
        .targetModel(_this.model.targetModel)
        .alignX("left")
        .alignY("top")
        .top(topPos)
        .left(leftPos)
        .updateView()
        .toggle();
    });

    this.infoEl = d3.select(this.element).select(".vzb-ip-info");
    if (_this.model.targetModel.isHook()) {
      legacy_utils.setIcon(this.infoEl, iconQuestion)
        .select("svg").attr("width", "0px").attr("height", "0px");

      this.infoEl.on("click", () => {
        _this.root.findChildByName("gapminder-datanotes").pin();
      });
      this.infoEl.on("mouseover", () => {
        const rect = _this.el_select.node().getBoundingClientRect();
        const rootRect = _this.root.element.getBoundingClientRect();
        const topPos = rect.bottom - rootRect.top;
        const leftPos = rect.left - rootRect.left + rect.width;

        _this.root.findChildByName("gapminder-datanotes").setHook(_this.model.targetModel._name).show().setPos(leftPos, topPos);
      });
      this.infoEl.on("mouseout", () => {
        _this.root.findChildByName("gapminder-datanotes").hide();
      });
    }

  },


  updateView() {
    if (!this._readyOnce) return;

    const _this = this;
    const translator = this.model.locale.getTFunction();

    const targetModel = _this.model.targetModel;
    const which = targetModel[_this.targetProp];
    const type = targetModel._type;

    let concept;
    let selectText;

    if (targetModel instanceof Hook) {
      concept = targetModel.getConceptprops();

      if (this.showHoverValues && this._highlighted) {
        const formatter = targetModel.getTickFormatter();

        selectText = (this._highlightedValue || this._highlightedValue === 0) ? formatter(this._highlightedValue) : translator("hints/nodata");

      } else {
        //Let the indicator "_default" in tree menu be translated differnetly for every hook type
        selectText = (which === "_default") ? translator("indicator/_default/" + type) : (concept.name_short);

      }

    } else {

      // targetModel is marker
      const dataManager = targetModel._root.dataManager;
      selectText = targetModel.space.map(dim => dataManager.getConceptProperty(targetModel._space[dim].dim, "name")).join(", ");

    }

    this.el_select.text(selectText)
      .attr("title", function(d) {
        return this.offsetWidth < this.scrollWidth ? selectText : null;
      });

    // hide info el if no data is available for it to make sense
    const hideInfoEl = concept && !concept.description && !concept.sourceName && !concept.sourceLink;
    this.infoEl.classed("vzb-invisible", hideInfoEl);
  }

}
