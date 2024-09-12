import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import { ICON_CLOSE as iconClose } from "../../icons/iconset";
import {updateRainbowLegend} from "./colorlegend-rainbow.js";
import { STATUS, isEntityConcept } from "../../utils.js";
import "./colorlegend.scss";
import { runInAction } from "mobx";
import {decorate, computed} from "mobx";
import * as d3 from "d3";

/*!
 * VIZABI BUBBLE COLOR LEGEND COMPONENT
 */

function isTrailBubble(d){
  return !!d[Symbol.for("trailHeadKey")];
}
const KEY = Symbol.for("key");

class ColorLegend extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-cl-outer">
        <div class="vzb-cl-holder">
          <div class="vzb-cl-minimap">
            <svg>
              <g></g>
            </svg>
          </div>

          <div class="vzb-cl-colorlist vzb-hidden"></div>

          <div class="vzb-cl-rainbow-holder vzb-hidden">
            <div class="vzb-cl-rainbow">
              <canvas></canvas>
            </div>

            <div class="vzb-cl-rainbow-legend">
              <div class="vzb-cl-rainbow-legend-eventarea"></div>
            </div>

            <div class="vzb-cl-labelscale">
              <svg>
                <g></g>
              </svg>
            </div>

            <div class="vzb-cl-subtitle">
              <span class="vzb-cl-subtitle-text"></span>
              <span class="vzb-cl-subtitle-reset"></span>
            </div>
          </div>
          
          <span class="vzb-cl-more-hint vzb-hidden">click for more options</span>

          <div class="vzb-cl-select-dialog vzb-hidden">
            <div class="vzb-cl-select-dialog-title"></div>
            <div class="vzb-cl-select-dialog-close"></div>
          </div>
      </div>
    `;

    super(config);
  }

  setup(options) {
    this.DOM = {
      wrapper: this.element.select(".vzb-cl-holder"),
    };

    this.DOM.minimap = this.DOM.wrapper.select(".vzb-cl-minimap");
    this.DOM.minimapSVG = this.DOM.minimap.select("svg");
    this.DOM.minimapG = this.DOM.minimapSVG.select("g");

    this.DOM.listColors = this.DOM.wrapper.select(".vzb-cl-colorlist");

    this.DOM.rainbowHolder = this.DOM.wrapper.select(".vzb-cl-rainbow-holder");
    this.DOM.rainbow = this.DOM.rainbowHolder.select(".vzb-cl-rainbow");
    this.DOM.rainbowCanvas = this.DOM.rainbow.select("canvas");
    this.DOM.rainbowLegend = this.DOM.rainbowHolder.select(".vzb-cl-rainbow-legend");
    this.DOM.rainbowLegendEventArea = this.DOM.rainbowLegend.select(".vzb-cl-rainbow-legend-eventarea");

    this.DOM.labelScale = this.DOM.rainbowHolder.select(".vzb-cl-labelscale");
    this.DOM.labelScaleSVG = this.DOM.labelScale.select("svg");
    this.DOM.labelScaleG = this.DOM.labelScaleSVG.select("g");
    this.DOM.subtitleDiv = this.DOM.rainbowHolder.select(".vzb-cl-subtitle");
    this.DOM.subtitleText = this.DOM.subtitleDiv.select(".vzb-cl-subtitle-text");
    this.DOM.subtitleReset = this.DOM.subtitleDiv.select(".vzb-cl-subtitle-reset");

    this.legendModelName = options.legendModelName;
    this.colorModelName = options.colorModelName;
  
    this._initSelectDialog();
  }


  get MDL() {
    return {
      color: this.model.encoding[this.colorModelName],
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted,
      superHighlighted: this.model.encoding.superhighlighted,
      legend: this.root.model.markers[this.legendModelName]
    };
  }

  draw() {
    this.localise = this.services.locale.auto();
   
    if (this._legendHasOwnModel() && !this._isLegendModelReady()) return;

    this.KEY = Symbol.for("key");
    this.canShowMap = this.MDL.legend && this._canShowMap();
    this.which = this.MDL.color.data.constant || this.MDL.color.data.concept;

    this.addReaction(this._updateView);
    this.addReaction(this.closeSelectDialogOnConceptChange);
  }

  _legendHasOwnModel() {
    return this.MDL.legend
      && !this.MDL.color.data.isConstant 
      && isEntityConcept(this.MDL.color.data.conceptProps);
  }

  _isLegendModelReady() {
    return this.MDL.legend.state == STATUS.READY;
  }

  _canShowMap() {
    if(!this._legendHasOwnModel()) return false;
    const dataArray = this.MDL.legend.dataArray;
    return dataArray.length > 0 && dataArray.every(d => d.map);
  }

  _updateView() {
    if (this._legendHasOwnModel() && !this._isLegendModelReady()) return;

    const individualColors = false;
    this._updateListLegend(this.MDL.color.scale.isDiscrete() && !this.canShowMap && !individualColors && !this.MDL.color.scale.isPattern);
    this._updateMinimapLegend(this.MDL.color.scale.isDiscrete() && this.canShowMap);
    updateRainbowLegend.bind(this)(!this.MDL.color.scale.isDiscrete());
  }

  _getUniqueColorValuesInAllFramesThatShouldAppearInTheChart(){
    const unique = new Set();
    this.model.getTransformedDataMap("filterRequired")
      .each(frame => frame.forEach(e => unique.add(e[this.colorModelName]) ));
    return unique;
  }

  _updateListLegend(isVisible) {
    this.DOM.listColors.classed("vzb-hidden", !isVisible);
    if (!isVisible) return;

    const _this = this;
    const cScale = this.MDL.color.scale.d3Scale;

    let colorOptionsArray = [];

    if (this._legendHasOwnModel() && this._isLegendModelReady() && !this.MDL.color.data.isConstant) {
      
      const relevantListItems = this._getUniqueColorValuesInAllFramesThatShouldAppearInTheChart();
      colorOptionsArray = this.MDL.legend.dataArray
        .filter(f => relevantListItems.has(f[this.which]));
    } else {
      colorOptionsArray = cScale.domain().map(value => {
        const result = {};
        result[this.which] = value;
        return result;
      });
    }

    let colorOptions = this.DOM.listColors.selectAll(".vzb-cl-option")
      .data(utils.unique(colorOptionsArray, d => d[this.which]), d => d[this.which]);

    colorOptions.exit().remove();

    colorOptions = colorOptions.enter().append("div").attr("class", "vzb-cl-option")
      .each(function() {
        d3.select(this).append("div").attr("class", "vzb-cl-color-sample");
        d3.select(this).append("div").attr("class", "vzb-cl-color-legend");
      })
      .on("mouseover", (event, d) => this._interact().mouseover(d))
      .on("mouseout", () => this._interact().mouseout())
      .on("click", (event, d) => {
        this._bindSelectDialogItems(d);
        this.DOM.selectDialog.classed("vzb-hidden", false);
      })
      .merge(colorOptions);

    colorOptions.each(function(d) {
      const cvalue = cScale(d[_this.which]);

      d3.select(this).select(".vzb-cl-color-sample")
        .style("background-color", cvalue)
        .style("border", `1px solid black`);
      //Apply names to color legend entries if color is a property
      let label = d["name"];
      if (!label && label !== 0) label = d[_this.which];
      if (_this.MDL.color.data.isConstant) label = _this.localise("indicator/_default/color");
      d3.select(this).select(".vzb-cl-color-legend").text(label);
    });
  }

  _updateMinimapLegend(isVisible) {
    this.DOM.minimap.classed("vzb-hidden", !isVisible);
    if (!isVisible) return;

    if (!this._isLegendModelReady()) return;

    const cScale = this.MDL.color.scale.d3Scale;

    const tempdivEl = this.DOM.minimap.append("div").attr("class", "vzb-temp");

    this.DOM.minimapSVG.attr("viewBox", null);
    this.DOM.minimapSVG.selectAll("g").remove();
    this.DOM.minimapG = this.DOM.minimapSVG.append("g");
    this.DOM.minimapG.selectAll("path")
      .data(this.MDL.legend.dataArray, d => d[this.KEY])
      .enter().append("path")
      .on("mouseover", (event, d) => this._interact().mouseover(d))
      .on("mouseout", () => this._interact().mouseout())
      .on("click", (event, d) => {
        this._bindSelectDialogItems(d);
        this.DOM.selectDialog.classed("vzb-hidden", false);
      })
      .each(function(d) {
        let shapeString = d["map"].trim();

        //check if shape string starts with svg tag -- then it's a complete svg
        if (shapeString.slice(0, 4) == "<svg") {
          //append svg element from string to the temporary div
          tempdivEl.html(shapeString);
          //replace the shape string with just the path data from svg
          //TODO: this is not very resilient. potentially only the first path will be taken!
          shapeString = tempdivEl.select("svg").select("path").attr("d");
        }

        d3.select(this)
          .attr("d", shapeString)
          .style("fill", cScale(d["color"]))
          .append("title").text(d["name"]);

        tempdivEl.html("");
      });

    const gbbox = this.DOM.minimapG.node().getBBox();
    this.DOM.minimapSVG.attr("viewBox", "0 0 " + gbbox.width * 1.05 + " " + gbbox.height * 1.05);
    tempdivEl.remove();

  }

  _interact() {
    const _this = this;

    return {
      mouseover(d) {
        _this.DOM.moreOptionsHint.classed("vzb-hidden", false);
        if (_this._interact().disableSelectHover()) return;

        const concept = _this.MDL.color.data.concept;
        const colorMdlName = _this.MDL.color.name;
        
        const selectArray = _this.model.dataArray?.filter(f => f[colorMdlName] == d[concept]);

        if (!selectArray) return;

        _this.root.ui?.chart?.superhighlightOnMinimapHover && _this.MDL.superHighlighted ?
          _this.MDL.superHighlighted.data.filter.set(selectArray) :
          _this.MDL.highlighted.data.filter.set(selectArray);
      },

      mouseout() {
        _this.DOM.moreOptionsHint.classed("vzb-hidden", true);
        if (_this._interact().disableSelectHover()) return;

        _this.root.ui?.chart?.superhighlightOnMinimapHover && _this.MDL.superHighlighted ?
          _this.MDL.superHighlighted.data.filter.clear() :
          _this.MDL.highlighted.data.filter.clear();
      },
      clickToAddAll(d) {
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        _this.model.data.filter.addUsingLimitedStructure({key: d[KEY], dim, prop});
      },
      clickToRemoveAll(d) {
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        _this.model.data.filter.deleteUsingLimitedStructure({key: d[KEY], dim, prop});
      },
      clickToRemoveEverythingElse(d) {
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;
        const everythingElse = _this.MDL.legend.dataArray.map(m => m[KEY]).filter(f => f !== d[KEY]);
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        _this.model.data.filter.deleteUsingLimitedStructure({key: everythingElse, dim, prop});
      },
      disableSelectHover(){
        if (_this.root.ui.dialogs?.markercontrols?.disableFindInteractions) return true;
      },
      disableAddAll(d){
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return true;
        if (_this.root.ui.dialogs?.markercontrols?.disableAddRemoveGroups) return true;
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        return !_this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: d[KEY], dim, prop});
      },
      disableRemoveAll(d){
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return true;
        if (_this.root.ui.dialogs?.markercontrols?.disableAddRemoveGroups) return true;
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        return _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: d[KEY], dim, prop});
      },
      disableRemoveEverythingElse(d){
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return true;
        if (_this.root.ui.dialogs?.markercontrols?.disableAddRemoveGroups) return true;
        const dim = _this.model.encoding.color.data.space[0];
        const prop = _this.MDL.color.data.concept;
        const everythingElse = _this.MDL.legend.dataArray.map(m => m[KEY]).filter(f => f !== d[KEY]);
        return _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key: d[KEY], dim, prop}) 
          //everything else is already removed
          || everythingElse.every(key => _this.model.data.filter.isAlreadyRemovedUsingLimitedStructure({key, dim, prop}) );
      },
      clickToSelect(d) {
        //experimentally removed this limitation, because discovered that the "string" concept property works too
        //this is especially useful for CSV-only data because there are no entity props linking to other entities, just strings
        // if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;

        const concept = _this.MDL.color.data.concept;
        const colorMdlName = _this.MDL.color.name;
        const selectedFilter = _this.MDL.selected.data.filter;
        
        const selectArray = _this.model.dataArray?.filter(f => !isTrailBubble(f) && f[colorMdlName] == d[concept]);
        
        if (!selectArray) return;

        if (selectArray.every(d => selectedFilter.has(d)))
          runInAction(() => selectedFilter.delete(selectArray));
        else
          runInAction(() => selectedFilter.set(selectArray));        
      }
    };
  }

  _initSelectDialog() {
    this.DOM.moreOptionsHint = this.DOM.wrapper.select(".vzb-cl-more-hint");

    this.DOM.selectDialog = this.DOM.wrapper.select(".vzb-cl-select-dialog");
    this.DOM.selectDialogTitle = this.DOM.selectDialog.select(".vzb-cl-select-dialog-title");

    this.DOM.selectDialogClose = this.DOM.selectDialog.select(".vzb-cl-select-dialog-close");
    this.DOM.selectDialogClose
      .html(iconClose)
      .on("click", () => this._closeSelectDialog());

    this.DOM.selectAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-clickable");

    this.DOM.addAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-clickable");  

    this.DOM.removeAllinGroup = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-clickable");  

    this.DOM.removeEverythingElse = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-clickable");  

    this.DOM.editColorButton = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-cl-select-dialog-item-moreoptions");
    this.DOM.editColorButton.append("label")
      .attr("class", "vzb-clickable")
      .attr("for", "vzb-cl-select-dialog-color-" + this.id);
    this.DOM.editColorButton.append("input")
      .attr("type", "color")
      .attr("class", "vzb-invisible")
      .attr("id", "vzb-cl-select-dialog-color-" + this.id);
    this.DOM.editColorButton.append("span")
      .attr("class", "vzb-clickable");

    this.DOM.editColorButtonTooltip = this.DOM.editColorButton.append("div")
      .attr("class", "vzb-cl-select-dialog-item-tooltip");
  }

  _updateUiStrings(name) {
    const t = this.localise;
    this.DOM.selectDialogTitle.text(name);
    this.DOM.moreOptionsHint.text(t("hints/color/more"));
    this.DOM.selectAllinGroup.text("✅ " + t("dialogs/color/select-all-in-group") + " " + name);
    this.DOM.addAllinGroup.text("✳️ " + t("dialogs/color/add-all-in-group") + " " + name);
    this.DOM.removeAllinGroup.text("🗑️ " + t("dialogs/color/remove-all-in-group") + " " + name);
    this.DOM.removeEverythingElse.text("🎯 " + t("dialogs/color/remove-else"));
    this.DOM.editColorButton.select("label").text("🎨 " + t("dialogs/color/edit-color"));
    this.DOM.editColorButton.select("span").text(t("buttons/reset"));
    this.DOM.editColorButtonTooltip.text(t("dialogs/color/edit-color-blocked-hint") 
      + " " + (this.MDL.color.data.conceptProps.name || this.MDL.color.data.concept)
    );
  }
  
  closeSelectDialogOnConceptChange(){
    this.MDL.color.data.concept;
    this._closeSelectDialog();
  }

  _closeSelectDialog() {
    this.DOM.selectDialog.classed("vzb-hidden", true);
  }

  _bindSelectDialogItems(d) {
    const _this = this;
    this._updateUiStrings(d.name);

    this.DOM.selectAllinGroup
      //experimentally removed this limitation, because discovered that the "string" concept property works too
      //this is especially useful for CSV-only data because there are no entity props linking to other entities, just strings
      .classed("vzb-hidden", () => this._interact().disableSelectHover(d))
      .on("click", () => {
        this._interact().clickToSelect(d);
        this._closeSelectDialog();
      });

    this.DOM.addAllinGroup
      .classed("vzb-hidden", () => this._interact().disableAddAll(d))
      .on("click", () => {
        this._interact().clickToAddAll(d);
        this._closeSelectDialog();
      });
    this.DOM.removeAllinGroup
      .classed("vzb-hidden", () => this._interact().disableRemoveAll(d))
      .on("click", () => {
        this._interact().clickToRemoveAll(d);
        this._closeSelectDialog();
      });
    this.DOM.removeEverythingElse
      .classed("vzb-hidden", () => this._interact().disableRemoveEverythingElse(d))
      .on("click", () => {
        this._interact().clickToRemoveEverythingElse(d);
        this._closeSelectDialog();
      });

    const isColorSelectable = this.MDL.color.scale.palette.isUserSelectable;
    this.DOM.editColorButtonTooltip.classed("vzb-hidden", isColorSelectable);
    this.DOM.editColorButton.select("span").classed("vzb-hidden", !isColorSelectable);
    this.DOM.editColorButton.classed("vzb-cl-select-dialog-item-disabled", !isColorSelectable);
    
    if (isColorSelectable){
      const colorScaleModel = this.MDL.color.scale;
      const concept = this.MDL.color.data.concept;
      const target = this.MDL.color.data.isConstant ? "_default" : d[concept];
      const colorOld = colorScaleModel.palette.getColor(target);
      const colorDef = colorScaleModel.palette.getColor(target, colorScaleModel.palette.defaultPalette);
      this.DOM.editColorButton.select("input")
        .property("value", colorOld)
        .on("input", function(){
          const value = d3.select(this).property("value");
          colorScaleModel.palette.setColor(value, target);
        })
        .on("change", function(){
          _this._closeSelectDialog();
        });

      //reset color
      this.DOM.editColorButton.select("span")
        .classed("vzb-hidden", colorOld == colorDef)
        .style("color", colorDef)
        .on("click", function(){
          colorScaleModel.palette.removeColor(target);
          _this._closeSelectDialog();
        });
    }
  }
}

const decorated = decorate(ColorLegend, {
  "MDL": computed
});
export { decorated as ColorLegend };
