import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import { ICON_CLOSE as iconClose } from "../../icons/iconset";
import ColorPicker from "../../legacy/helpers/d3.colorPicker";
import axisSmart from "../../legacy/helpers/d3.axisWithLabelPicker";
import { STATUS, isEntityConcept } from "../../utils.js";
import "./colorlegend.scss";
import { runInAction } from "mobx";
import {decorate, computed} from "mobx";

/*!
 * VIZABI BUBBLE COLOR LEGEND COMPONENT
 */

function isTrailBubble(d){
  return !!d[Symbol.for("trailHeadKey")];
}

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
              <svg>
                <g>
                  <rect></rect>
                </g>
              </svg>
            </div>

            <div class="vzb-cl-labelscale">
              <svg>
                <g></g>
              </svg>
            </div>

            <div class="vzb-cl-subtitle">
              <span class="vzb-cl-subtitle-text"></span>
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
    this.DOM.rainbowLegendSVG = this.DOM.rainbowLegend.select("svg");
    this.DOM.rainbowLegendG = this.DOM.rainbowLegendSVG.select("g");
    //this.DOM.rainbowLegendG.append("rect");
    this.rainbowLegend = null;

    this.DOM.labelScale = this.DOM.rainbowHolder.select(".vzb-cl-labelscale");
    this.DOM.labelScaleSVG = this.DOM.labelScale.select("svg");
    this.DOM.labelScaleG = this.DOM.labelScaleSVG.select("g");
    this.DOM.subtitleDiv = this.DOM.rainbowHolder.select(".vzb-cl-subtitle");
    this.DOM.subtitleText = this.DOM.subtitleDiv.select(".vzb-cl-subtitle-text");

    this.legendModelName = options.legendModelName;
    this.colorModelName = options.colorModelName;
  
    this.colorPicker = new ColorPicker(this.root.element);
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
    this.colorPicker.translate(this.localise);
   
    if (this._legendHasOwnModel() && !this._isLegendModelReady()) return;

    this.KEY = Symbol.for("key");
    this.canShowMap = this.MDL.legend && this._canShowMap();
    this.which = this.MDL.color.data.constant || this.MDL.color.data.concept;

    this.addReaction(this._updateView);
    this.addReaction(this._translateSelectDialog);
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
    this._updateListLegend(this.MDL.color.scale.isDiscrete() && !this.canShowMap && !individualColors);
    this._updateMinimapLegend(this.MDL.color.scale.isDiscrete() && this.canShowMap);
    this._updateRainbowLegend(!this.MDL.color.scale.isDiscrete());
  }

  _updateListLegend(isVisible) {
    this.DOM.listColors.classed("vzb-hidden", !isVisible);
    if (!isVisible) return;

    const _this = this;
    const cScale = this._legendHasOwnModel() && this._isLegendModelReady()? this.MDL.legend.encoding.color.scale.d3Scale : this.MDL.color.scale.d3Scale;

    let colorOptionsArray = [];

    if (this._legendHasOwnModel() && this._isLegendModelReady() && !this.MDL.color.data.isConstant) {
      colorOptionsArray = this.MDL.legend.dataArray;
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
      .on("mouseover", _this._interact().mouseover)
      .on("mouseout", _this._interact().mouseout)
      .on("click", (...args) => {
        this._bindSelectDialogItems(...args);
        this.DOM.selectDialog.classed("vzb-hidden", false);
      })
      .merge(colorOptions);

    colorOptions.each(function(d) {
      d3.select(this).select(".vzb-cl-color-sample")
        .style("background-color", cScale(d[_this.which]))
        .style("border", "1px solid " + cScale(d[_this.which]));
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

    const cScale = this.MDL.legend.encoding.color.scale.d3Scale;

    const tempdivEl = this.DOM.minimap.append("div").attr("class", "vzb-temp");

    this.DOM.minimapSVG.attr("viewBox", null);
    this.DOM.minimapSVG.selectAll("g").remove();
    this.DOM.minimapG = this.DOM.minimapSVG.append("g");
    this.DOM.minimapG.selectAll("path")
      .data(this.MDL.legend.dataArray, d => d[this.KEY])
      .enter().append("path")
      .on("mouseover", this._interact().mouseover)
      .on("mouseout", this._interact().mouseout)
      .on("click", (...args) => {
        this._bindSelectDialogItems(...args);
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
    const which = this.which;

    return {
      mouseover(d) {
        _this.DOM.moreOptionsHint.classed("vzb-hidden", false);

        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;
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

        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;
        _this.root.ui?.chart?.superhighlightOnMinimapHover && _this.MDL.superHighlighted ?
          _this.MDL.superHighlighted.data.filter.clear() :
          _this.MDL.highlighted.data.filter.clear();
      },
      clickToChangeColor(d, i, group, d3event = d3.event) {
        //disable interaction if so stated in concept properties
        //if (!_this.MDL.color.scale.palette.isUserSelectable) return;
        const colorScaleModel = _this.MDL.color.scale;
        const defaultPalette = colorScaleModel.palette.defaultPalette;
        const target = !colorScaleModel.isDiscrete() ? d.paletteKey : d[which];
        _this.colorPicker
          .colorOld(colorScaleModel.palette.getColor(target))
          .colorDef(colorScaleModel.palette.getColor(target, defaultPalette))
          .callback((value, isClick) => colorScaleModel.palette.setColor(value, "" + target, null, isClick, isClick))
          .fitToScreen([d3event.pageX, d3event.pageY])
          .show(true);
      },
      clickToShow(d) {
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;

        const filter = _this.model.data.filter;
        const colorSpace = _this.model.encoding.color.data.space;
        const concept = _this.MDL.color.data.concept;
        
        filter.config.dimensions[colorSpace][concept] = d[concept];
      },
      clickToSelect(d) {
        if (!isEntityConcept(_this.MDL.color.data.conceptProps)) return;

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

    this.DOM.selectAllButton = this.DOM.selectDialog.append("div")
      .attr("class", "vzb-cl-select-dialog-item vzb-clickable");

    this.DOM.removeElseButton = this.DOM.selectDialog.append("div")
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

  _translateSelectDialog() {
    const t = this.localise;
    this.DOM.moreOptionsHint.text(t("hints/color/more"));
    this.DOM.selectAllButton.text("✅ " + t("dialogs/color/select-all"));
    this.DOM.removeElseButton.text("🗑️ " + t("dialogs/color/remove-else"));
    this.DOM.editColorButton.select("label").text("🎨 " + t("dialogs/color/edit-color"));
    this.DOM.editColorButton.select("span").text(t("buttons/reset"));
    this.DOM.editColorButtonTooltip.text(t("dialogs/color/edit-color-blocked-hint"));
  }
  
  closeSelectDialogOnConceptChange(){
    this.MDL.color.data.concept;
    this._closeSelectDialog();
  }

  _closeSelectDialog() {
    this.DOM.selectDialog.classed("vzb-hidden", true);
  }

  _bindSelectDialogItems(...args) {
    const _this = this;
    const [d] = args;
    this.DOM.selectDialogTitle.text(d.name);

    this.DOM.selectAllButton
      .classed("vzb-cl-select-dialog-item-disabled", !isEntityConcept(this.MDL.color.data.conceptProps))
      .on("click", () => {
        this._interact().clickToSelect(...args);
        this._closeSelectDialog();
      });

    this.DOM.removeElseButton
      .classed("vzb-cl-select-dialog-item-disabled", !isEntityConcept(this.MDL.color.data.conceptProps))
      .on("click", () => {
        this._interact().clickToShow(...args);
        this._closeSelectDialog();
      });

    const isColorSelectable = this.MDL.color.scale.palette.isUserSelectable;
    this.DOM.editColorButtonTooltip.classed("vzb-hidden", isColorSelectable);
    this.DOM.editColorButton.select("span").classed("vzb-hidden", !isColorSelectable);
    this.DOM.editColorButton.classed("vzb-cl-select-dialog-item-disabled", !isColorSelectable);
    
    if (isColorSelectable){
      const colorScaleModel = this.MDL.color.scale;
      const concept = this.MDL.color.data.concept;
      const target = this.MDL.color.data.isConstant ? "_default" :
        (colorScaleModel.isDiscrete() ? d[concept] : d.paletteKey);
      const colorOld = colorScaleModel.palette.getColor(target);
      const colorDef = colorScaleModel.palette.getColor(target, colorScaleModel.palette.defaultPalette);
      this.DOM.editColorButton.select("input")
        .property("value", colorOld)
        .on("input", function(){
          const value = d3.select(this).property("value");
          colorScaleModel.palette.setColor(value, "" + target);
        })
        .on("change", function(){
          _this._closeSelectDialog();
        });

      this.DOM.editColorButton.select("span")
        .classed("vzb-hidden", colorOld == colorDef)
        .style("color", colorDef)
        .on("click", function(){
          colorScaleModel.palette.setColor(colorDef, "" + target);
          _this._closeSelectDialog();
        });
    }
  }

  _updateRainbowLegend(isVisible) {
    const _this = this;
    const colorModel = this.MDL.color.scale;

    //Hide rainbow element if showing minimap or if color is discrete
    this.DOM.rainbowHolder.classed("vzb-hidden", !isVisible);
    //this.DOM.labelScale.classed("vzb-hidden", !isVisible);
    //this.DOM.rainbowLegend.classed("vzb-hidden", !isVisible);
    if (!isVisible) return;

    const gradientWidth = this.DOM.rainbow.node().getBoundingClientRect().width;
    const paletteKeys = colorModel.palette.paletteDomain.map(parseFloat);
    const cScale = colorModel.d3Scale.copy();
    const circleRadius = 6;

    let domain;
    let range;
    //const formatter = colorModel.getTickFormatter();
    let fitIntoScale = null;

    const paletteLabels = colorModel.palette.paletteLabels;

    if (paletteLabels) {

      fitIntoScale = "optimistic";

      domain = paletteLabels.map(val => parseFloat(val));
      const paletteMax = d3.max(domain);
      range = domain.map(val => val / paletteMax * gradientWidth);

    } else {

      domain = cScale.domain();
      const paletteMax = d3.max(paletteKeys);
      range = paletteKeys.map(val => val / paletteMax * gradientWidth);

    }

    //const labelScaleType = (d3.min(domain) <= 0 && d3.max(domain) >= 0 && colorModel.scaleType === "log") ? "genericLog" : colorModel.scaleType;

    this.labelScale = cScale.copy()
      .interpolate(d3.interpolate)
      .range(range);

    const marginLeft = parseInt(this.DOM.rainbow.style("left"), 10) || 0;
    const marginRight = parseInt(this.DOM.rainbow.style("right"), 10) || marginLeft;

    this.DOM.labelScaleSVG.style("width", marginLeft + gradientWidth + marginRight + "px");
    this.DOM.labelScaleG.attr("transform", "translate(" + marginLeft + ",2)");
    this.labelsAxis = axisSmart("bottom");
    this.labelsAxis.scale(this.labelScale)
      //.tickFormat(formatter)
      .tickSizeOuter(5)
      .tickPadding(8)
      .tickSizeMinor(3, -3)
      .labelerOptions({
        scaleType: colorModel.type,
        toolMargin: {
          right: marginRight,
          left: marginLeft
        },
        showOuter: false,
        formatter: this.localise,
        bump: marginLeft,
        cssFontSize: "8px",
        fitIntoScale
      });

    this.DOM.labelScaleG.call(this.labelsAxis);

    this.DOM.rainbowCanvas
      .attr("width", gradientWidth)
      .attr("height", 1)
      .style("width", gradientWidth + "px")
      .style("height", "100%");

    const context = this.DOM.rainbowCanvas.node().getContext("2d");
    const image = context.createImageData(gradientWidth, 1);
    for (let i = 0, j = -1, c; i < gradientWidth; ++i) {
      c = d3.rgb(cScale(this.labelScale.invert(i)));
      image.data[++j] = c.r;
      image.data[++j] = c.g;
      image.data[++j] = c.b;
      image.data[++j] = 255;
    }
    context.putImageData(image, 0, 0);

    const conceptProps = this.MDL.color.data.conceptProps;
    const subtitle = utils.getSubtitle(conceptProps.name, conceptProps.name_short);

    this.DOM.subtitleDiv.classed("vzb-hidden", subtitle == "");
    this.DOM.subtitleText.text(subtitle);

    //rainbow legend setup
    if (this.DOM.rainbowLegend.style("display") !== "none") {
      const edgeDomain = d3.extent(domain);

      this.domainScale = this.labelScale.copy()
        .domain(edgeDomain)
        .range(edgeDomain);

      this.paletteScaleLinear = d3.scaleLinear().domain(edgeDomain).range([0, 100]);

      this.DOM.rainbowLegendSVG.style("width", marginLeft + gradientWidth + marginRight + "px");
      this.DOM.rainbowLegendG.attr("transform", "translate(" + marginLeft + ", " + 7 + ")");

      this.DOM.labelScale.selectAll(".vzb-axis-value text").attr("dy", "1.5em");

      if (!edgeDomain.includes(0)) {
        //find tick with zero
        this.DOM.labelScaleG.selectAll(".tick text").filter(function() { return d3.select(this).text() === "0"; })
          .style("cursor", "pointer")
          .on("dblclick", () => {
            const color = cScale(0);
            const paletteKey = +_this.paletteScaleLinear(_this.domainScale(0));
            colorModel.palette.setColor(color, "" + paletteKey, null, true, true);
          });
      }

      this.DOM.rainbowLegendG.select("rect")
        .attr("width", gradientWidth)
        .attr("height", 20)
        .on("mousemove", function() {
          _this.DOM.labelScaleG.call(_this.labelsAxis.highlightValue(_this.labelScale.invert(d3.mouse(this)[0])));
        })
        .on("mouseleave", () => _this.DOM.labelScaleG.call(_this.labelsAxis.highlightValue("none")))
        .on("dblclick", function() {
          let x = d3.mouse(this)[0];
          x = x <= (circleRadius * 2) ? circleRadius * 2 : x >= (gradientWidth - circleRadius * 2) ? gradientWidth - circleRadius * 2 : x;
          const newValue = _this.labelScale.invert(x);
          const color = cScale(newValue);
          const paletteKey = _this.paletteScaleLinear(_this.domainScale(newValue));
          colorModel.palette.setColor(color, "" + paletteKey, null, true, true);
        });

      const colorRange = cScale.range();

      const value0 = d3.min(domain) < 0 && d3.max(domain) > 0 ? this.labelScale(0) : null;
      const gIndicators = domain.map((val, i) => ({ val, i, value0,
        isEdgePoint: i === 0 || i === domain.length - 1,
        color: colorRange[i],
        paletteKey: paletteKeys[i],
        xMin: i - 1 < 0 ? 1 : this.labelScale(domain[i - 1]) + circleRadius * 2,
        xMax: i + 1 >= domain.length ? gradientWidth - 1 : this.labelScale(domain[i + 1]) - circleRadius * 2
      }));

      const legendDrag = d3.drag()
        .on("start", function start(d) {
          //click сompatible node raise
          let nextSibling = this.nextSibling;
          while (nextSibling) {
            this.parentNode.insertBefore(nextSibling, this);
            nextSibling = this.nextSibling;
          }

          const circle = d3.select(this);
          let dragged = false;
          let ghostCircle = null;

          if (d.isEdgePoint) {
            ghostCircle = circle.clone().lower().classed("ghost", true).style("opacity", 0.8);
          }

          circle.classed("dragging", true);

          d3.event.on("drag", drag).on("end", end);

          function drag(d) {
            if (d3.event.x < 0) return;
            if (d3.event.x > gradientWidth) return;
            if (d3.event.x < d.xMin || d3.event.x > d.xMax) return;
            if (!dragged && d3.event.dx !== 0) dragged = true;

            d.x = d3.event.x;
            if (d.value0 !== null) {
              d.x = (d.x < d.value0 - 3 || d.x > d.value0 + 3) ? d.x : d.value0;
            }

            circle.attr("cx", d.x);

            if (dragged) {
              const newValue = _this.labelScale.invert(d.x);
              const paletteKey = +_this.paletteScaleLinear(_this.domainScale(newValue));
              _this.DOM.labelScaleG.call(_this.labelsAxis.highlightValue(newValue));

              colorModel.palette.setColor(d.color, "" + paletteKey, !d.isEdgePoint ? "" + d.paletteKey : "-1", false);
              d.val = newValue;

              if (d.isEdgePoint && d.paletteKey !== paletteKey) d.isEdgePoint = false;

              d.paletteKey = paletteKey;
            }
          }

          function end(d) {
            circle.classed("dragging", false);
            if (ghostCircle) ghostCircle.remove();

            if (dragged) {
              let snapX = null;

              if (d.x < (circleRadius * 2)) {
                snapX = d.x < circleRadius ? 0 : (circleRadius * 2);
              } else if (d.x > (gradientWidth - circleRadius * 2)) {
                snapX = d.x > (gradientWidth - circleRadius) ? gradientWidth : (gradientWidth - circleRadius * 2);
              }

              utils.defer(() => {
                if (snapX !== null) {
                  const newValue = _this.labelScale.invert(snapX);
                  const paletteKey = +_this.paletteScaleLinear(_this.domainScale(newValue));
                  colorModel.palette.setColor(d.color, "" + paletteKey, "" + d.paletteKey, false, false);
                  colorModel.palette.setColor(d.color, "" + paletteKey, "" + d.paletteKey, true, true);
                } else {
                  colorModel.palette.setColor(d.color, "" + d.paletteKey, null, true, true);
                }
              });
            }
          }
        });

      let dblclick = false;
      let lastClickId;

      this.rainbowLegend = this.DOM.rainbowLegendG.selectAll("circle")
        .data(gIndicators, d => d.i);
      this.rainbowLegend.exit().remove();
      this.rainbowLegend = this.rainbowLegend.enter().append("circle")
        .attr("r", circleRadius + "px")
        .attr("stroke", "#000")
        .on("mouseenter", d => {
          _this.DOM.labelScaleG.call(_this.labelsAxis.highlightValue(d.val));
        })
        .on("mouseleave", () => {
          _this.DOM.labelScaleG.call(_this.labelsAxis.highlightValue("none"));
        })
        .on("click", (d, i) => {
          const d3event = { pageX: d3.event.pageX, pageY: d3.event.pageY };
          lastClickId = setTimeout(() => {
            if (!dblclick) _this._interact().clickToChangeColor(d, i, null, d3event);
            else {
              clearTimeout(lastClickId);
              dblclick = false;
            }
          }, 500);
        })
        .on("dblclick", d => {
          dblclick = true;
          if (d.isEdgePoint) return;
          utils.defer(() => {
            colorModel.palette.setColor(null, null, "" + d.paletteKey, true, true);
          });
        })
        .call(legendDrag)
        .merge(this.rainbowLegend);

      this.rainbowLegend.each(function(d) {
        d3.select(this).attr("fill", d.color);
        d3.select(this).attr("cx", d.x = _this.labelScale(d.val));
      });
    }

  }

}

const decorated = decorate(ColorLegend, {
  "MDL": computed
});
export { decorated as ColorLegend };
