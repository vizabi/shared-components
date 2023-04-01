import * as utils from "../../legacy/base/utils";
import {BaseComponent} from "../base-component.js";
import {decorate, computed, runInAction} from "mobx";
import { ICON_CLOSE as iconClose } from "../../icons/iconset.js";
import * as d3 from "d3";

function key(d) {return d[Symbol.for("key")];}

const PROFILE_CONSTANTS = {
  SMALL: {
    minLabelTextSize: 7,
    maxLabelTextSize: 21,
    defaultLabelTextSize: 12,
    closeCrossSize: 16 * 1.2,
    labelLeashCoeff: 0.4
  },
  MEDIUM: {
    minLabelTextSize: 7,
    maxLabelTextSize: 30,
    defaultLabelTextSize: 15,
    closeCrossSize: 20 * 1.2,
    labelLeashCoeff: 0.3
  },
  LARGE: {
    minLabelTextSize: 6,
    maxLabelTextSize: 48,
    defaultLabelTextSize: 20,
    closeCrossSize: 22 * 1.2,
    labelLeashCoeff: 0.2
  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    minLabelTextSize: 15,
    maxLabelTextSize: 35,
    defaultLabelTextSize: 15,
    closeCrossSize: 26 * 1.2,
    labelLeashCoeff: 0.3
  },
  LARGE: {
    minLabelTextSize: 20,
    maxLabelTextSize: 55,
    defaultLabelTextSize: 20,
    closeCrossSize: 32 * 1.2,
    labelLeashCoeff: 0.2
  }
};

const OPTIONS = {
  LABELS_CONTAINER_CLASS: "",
  LINES_CONTAINER_CLASS: "",
  LINES_CONTAINER_SELECTOR: "",
  CSS_PREFIX: "",
  SUPPRESS_HIGHLIGHT_DURING_PLAY: true
};

class Labels extends BaseComponent {

  setup(options){
    this.context = this.parent;

    this._xScale = null;
    this._yScale = null;
    this._closeCrossHeight = 0;
    this.labelSizeTextScale = null;
    
    this.cached = {};
    this.label = this.LABEL(this);

    this.options = utils.extend({}, OPTIONS);
    if(options) this.setOptions(options);
    this.label.setCssPrefix(this.options.CSS_PREFIX);

    this.labelsContainer = this.context.element.select("." + this.options.LABELS_CONTAINER_CLASS);
    this.linesContainer = this.context.element.select("." + this.options.LINES_CONTAINER_CLASS);
    this.tooltipEl = this.labelsContainer
      .append("g").attr("class", this.options.CSS_PREFIX + "-tooltip");
  }

  setOptions(newOptions) {
    utils.extend(this.options, newOptions);
  }

  get MDL() { 
    return{
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected.data.filter,
      highlighted: this.model.encoding.highlighted.data.filter,
      size: this.model.encoding.size,
      size_label: this.model.encoding.size_label,
      color: this.model.encoding.color,
      label: this.model.encoding.label
    };
  }

  draw() {
    this.addReaction(this._updateLayoutProfile);
    this.addReaction(this.selectDataPoints);
    this.addReaction(this.updateSizeTextScale);
    this.addReaction(this.updateLabelSizeLimits);
    this.addReaction(this.updateLabelsOnlyTextSize);
    this.addReaction(this.updateCloseCrossHeight);
    this.addReaction(this.updateTooltipFontSize);
  }

  updateLabelSizeLimits() {
    if (!this.MDL.size_label) return;

    this.services.layout.size;

    const extent = this.MDL.size_label.scale.extent || [0, 1];

    const minLabelTextSize = this.profileConstants.minLabelTextSize;
    const maxLabelTextSize = this.profileConstants.maxLabelTextSize;
    const minMaxDelta = maxLabelTextSize - minLabelTextSize;

    this.minLabelTextSize = Math.max(minLabelTextSize + minMaxDelta * extent[0], minLabelTextSize);
    this.maxLabelTextSize = Math.max(minLabelTextSize + minMaxDelta * extent[1], minLabelTextSize);

    if (this.MDL.size_label.data.isConstant) {
      // if(!this.MDL.size_label.which) {
      //   this.maxLabelTextSize = this.profileConstants.defaultLabelTextSize;
      //   this.MDL.size_label.set({'domainMax': (this.maxLabelTextSize - minLabelTextSize) / minMaxDelta, 'which': '_default'});
      //   return;
      // }
      if (extent[1] === null) {
        this.minLabelTextSize = this.maxLabelTextSize = this.profileConstants.defaultLabelTextSize;
      } else {
        this.minLabelTextSize = this.maxLabelTextSize;
      }
    }

    this.labelSizeTextScale.range([this.minLabelTextSize, this.maxLabelTextSize]);
  }

  updateSizeTextScale() {

    //scales
    if (this.MDL.size_label) {
      this.labelSizeTextScale = this.MDL.size_label.scale.d3Scale;
    }
  }

  setScales(xScale, yScale) {
    this._xScale = xScale;
    this._yScale = yScale;
  }

  updateCloseCrossHeight() {
    this.services.layout.size;
    const closeCrossHeight = this.profileConstants.closeCrossSize;

    if (this._closeCrossHeight != closeCrossHeight) {
      this._closeCrossHeight = closeCrossHeight;
      if (this.entityLabels)
        this.updateLabelCloseGroupSize(this.entityLabels.selectAll("." + this.options.CSS_PREFIX + "-label-x"), this._closeCrossHeight);
    }
  }

  xScale(x) {
    return this._xScale ? this._xScale(x) : (x * this.context.width);
  }

  yScale(y) {
    return this._yScale ? this._yScale(y) : (y * this.context.height);
  }

  selectDataPoints() {
    const _this = this;
    const _cssPrefix = this.options.CSS_PREFIX;

    //const select = _this.model.dataArray.filter(d => this.MDL.selected.has(d));
    const select = [...this.MDL.selected.markers.keys()]
      .filter(key => _this.model.dataMap.hasByStr(key))
      .map(selectedKey => ({[Symbol.for("key")]: selectedKey}));
    this.entityLabels = this.labelsContainer.selectAll("." + _cssPrefix + "-entity")
      .data(select, key);
    this.entityLines = this.linesContainer.selectAll("g.entity-line." + _cssPrefix + "-entity")
      .data(select, key);

    this.entityLabels.exit()
      .each(d => {
        if (_this.cached[key(d)] != null) {
          _this.cached[key(d)] = void 0;
        }
      })
      .remove();
    this.entityLines.exit()
      .remove();

    this.entityLines = this.entityLines
      .enter().insert("g", function(d) {
        return this.querySelector("." + _this.options.LINES_CONTAINER_SELECTOR_PREFIX + CSS.escape(key(d)));
      })
      .attr("class", (d) => _cssPrefix + "-entity entity-line line-" + key(d))
      .each(function() {
        _this.label.line(d3.select(this));
      })
      .merge(this.entityLines)
      .classed("vzb-hidden", !this.ui.enabled);

    this.entityLabels = this.entityLabels
      .enter().append("g")
      .attr("class", (d) => _cssPrefix + "-entity label-" + key(d))
      .each(function(d) {
        _this.cached[key(d)] = { _new: true };
        _this.label(d3.select(this));
      })
      .merge(this.entityLabels)
      .classed("vzb-hidden", !this.ui.enabled);
  
    Object.keys(this.ui.offset).forEach(key => {
      if (!this.MDL.selected.has(key)) {
        delete this.ui.offset[key];
      }
    });
  }

  showCloseCross(d, show) {
    //show the little cross on the selected label
    this.entityLabels
      .filter(f => d ? key(f) == key(d) : true)
      .select("." + this.options.CSS_PREFIX + "-label-x")
      .classed("vzb-transparent", !show || utils.isTouchDevice());
  }

  highlight(d, highlight) {
    let labels = this.entityLabels;
    if (!labels) return;
    if (d) {
      labels = labels.filter(f => d ? key(f) == key(d) : true);
    }
    labels.classed("vzb-highlighted", highlight);
  }

  updateLabel(d, cache, valueX, valueY, valueS, valueC, valueL, valueLST, duration, showhide) {
    const _this = this;
    if (key(d) == this.dragging) return;

    const _cssPrefix = this.options.CSS_PREFIX;

    // only for selected entities
    if (this.MDL.selected.has(d)  && this.entityLabels != null) {
      if (this.cached[key(d)] == null) this.selectDataPoints();

      const cached = this.cached[key(d)];
      if (cache) utils.extend(cached, cache);


      if (cached.scaledS0 == null || cached.labelX0 == null || cached.labelY0 == null) { //initialize label once
        this._initNewCache(cached, valueX, valueY, valueS, valueC, valueL, valueLST);
      }

      if (cached.labelX_ == null || cached.labelY_ == null) {
        const labelOffset = this.ui.offset[key(d)];
        cached.labelOffset = (labelOffset && labelOffset.slice(0)) || [0, 0];
      }

      const brokenInputs = !cached.labelX0 && cached.labelX0 !== 0 || !cached.labelY0 && cached.labelY0 !== 0 || !cached.scaledS0 && cached.scaledS0 !== 0;

      const lineGroup = this.entityLines.filter(f => key(f) == key(d));
      // reposition label
      this.entityLabels.filter(f => key(f) == key(d))
        .each(function() {

          const labelGroup = d3.select(this);

          if (brokenInputs) {
            labelGroup.classed("vzb-invisible", brokenInputs);
            lineGroup.classed("vzb-invisible", brokenInputs);
            return;
          }

          const text = labelGroup.selectAll("." + _cssPrefix + "-label-content")
            .text(valueL || cached.labelText);

          _this._updateLabelSize(d, null, labelGroup, valueLST, text);

          _this.positionLabel(d, null, this, duration, showhide, lineGroup);
        });
    }
  }

  _initNewCache(cached, valueX, valueY, valueS, valueC, valueL, valueLST) {
    if (valueS || valueS === 0) cached.scaledS0 = utils.areaToRadius(this.context.sScale(valueS));
    cached.valueS0 = valueS;
    cached.labelX0 = valueX;
    cached.labelY0 = valueY;
    cached.labelText = valueL;
    cached.valueLST = valueLST;
    cached.scaledC0 = valueC != null ? this.context.cScale(valueC) : this.context.COLOR_WHITEISH;
  }



  setTooltip(d, tooltipText, tooltipCache, labelValues) {
    if (tooltipText) {
      let position = 0;
      const _cssPrefix = this.options.CSS_PREFIX;
      this.tooltipEl.raise().text(null);
      this.label(this.tooltipEl, true);
      if (d) {
        const cache = {};
        this._initNewCache(cache, labelValues.valueX, labelValues.valueY, labelValues.valueS, labelValues.valueC, "", labelValues.valueLST);
        this.tooltipEl
          .classed(this.options.CSS_PREFIX + "-tooltip", false)
          .classed(this.options.CSS_PREFIX + "-entity", true)
          .selectAll("." + _cssPrefix + "-label-content")
          .text(labelValues.labelText);
        this._updateLabelSize(d, cache, this.tooltipEl, labelValues.valueLST);
        position = this.positionLabel(d, cache, this.tooltipEl.node(), 0, null, this.tooltipEl.select(".lineemptygroup"));
      }
      this.tooltipEl
        .classed(this.options.CSS_PREFIX + "-entity", false)
        .classed(this.options.CSS_PREFIX + "-tooltip", true)
        .selectAll("." + _cssPrefix + "-label-content")
        .text(tooltipText);
      this._updateLabelSize(d, tooltipCache, this.tooltipEl, null);
      this.positionLabel(d, tooltipCache, this.tooltipEl.node(), 0, null, this.tooltipEl.select(".lineemptygroup"), position);
    } else {
      this.tooltipEl.text(null);
    }
  }

  updateTooltipFontSize() {
    this.services.layout.size;
    this.tooltipEl.style("font-size", this.profileConstants.defaultLabelTextSize);
  }

  _updateLabelSize(d, cache, labelGroup, valueLST, text) {
    const _this = this;
    const cached = cache || _this.cached[key(d)];


    const _cssPrefix = this.options.CSS_PREFIX;

    const labels = this.root.ui.chart.labels;
    labelGroup.classed("vzb-label-boxremoved", labels.removeLabelBox);

    const _text = text || labelGroup.selectAll("." + _cssPrefix + "-label-content");

    if (_this.labelSizeTextScale) {
      if (valueLST != null) {
        const range = _this.labelSizeTextScale.range();
        const fontSize = range[0] + Math.sqrt((_this.labelSizeTextScale(valueLST) - range[0]) * (range[1] - range[0]));
        _text.attr("font-size", fontSize + "px");
        cached.fontSize = fontSize;
        if (!cached.initFontSize) cached.initFontSize = fontSize;
      } else {
        _text.attr("font-size", null);
        cached.fontSize = parseFloat(_text.style("font-size"));
        if (!cached.initFontSize) cached.initFontSize = cached.fontSize;
      }
    } else {
      cached.fontSize = parseFloat(_text.style("font-size"));
      if (!cached.initFontSize) cached.initFontSize = cached.fontSize;
    }

    let contentBBox;
    //if (!cached.initTextBBox) {
    //turn off stroke because ie11/edge return stroked bounding box for text
    _text.style("stroke", "none");
    cached.initTextBBox = _text.node().getBBox();
    _text.style("stroke", null);
    contentBBox = cached.textBBox = {
      width: cached.initTextBBox.width,
      height: cached.initTextBBox.height
    };
    //}

    const scale = cached.fontSize / cached.initFontSize;
    cached.textBBox.width = cached.initTextBBox.width * scale;
    cached.textBBox.height = cached.initTextBBox.height * scale;

    contentBBox = cached.textBBox;

    const rect = labelGroup.selectAll("rect");

    if (!cached.textWidth || cached.textWidth != contentBBox.width) {
      cached.textWidth = contentBBox.width;

      const labelCloseHeight = _this._closeCrossHeight || contentBBox.height;

      const isRTL = _this.services.locale.isRTL();
      const labelCloseGroup = labelGroup.select("." + _cssPrefix + "-label-x")
        .attr("transform", "translate(" + (isRTL ? -contentBBox.width - 4 : 4) + "," + (-contentBBox.height * 0.85) + ")");

      this.updateLabelCloseGroupSize(labelCloseGroup, labelCloseHeight);

      //cache label bound rect for reposition
      const rectBBox = cached.rectBBox = {
        x: -contentBBox.width - 4,
        y: -contentBBox.height * 0.85,
        width: contentBBox.width + 8,
        height: contentBBox.height * 1.2
      };
      cached.rectOffsetX = rectBBox.width + rectBBox.x;
      cached.rectOffsetY = rectBBox.height + rectBBox.y;

      rect.attr("width", rectBBox.width)
        .attr("height", rectBBox.height)
        .attr("x", rectBBox.x)
        .attr("y", rectBBox.y)
        .attr("rx", contentBBox.height * 0.2)
        .attr("ry", contentBBox.height * 0.2);
    }

    const glowRect = labelGroup.select(".vzb-label-glow");
    if (glowRect.attr("stroke") !== cached.scaledC0) {
      glowRect.attr("stroke", cached.scaledC0);
    }
  }

  updateLabelCloseGroupSize(labelCloseGroup, labelCloseHeight) {
    labelCloseGroup.select("circle")
      .attr("cx", /*contentBBox.height * .0 + */ 0)
      .attr("cy", 0)
      .attr("r", labelCloseHeight * 0.5);

    labelCloseGroup.select("svg")
      .attr("x", -labelCloseHeight * 0.5)
      .attr("y", labelCloseHeight * -0.5)
      .attr("width", labelCloseHeight)
      .attr("height", labelCloseHeight);

  }

  updateLabelsOnlyTextSize() {
    const _this = this;
    this.MDL.size_label.scale.extent;
    this.services.layout.size;

    runInAction(() => {
      this.entityLabels.each(function(d) {
        _this._updateLabelSize(d, null, d3.select(this), _this.model.dataMap.getByStr(d[Symbol.for("key")]).size_label);
        if (_this.cached[key(d)]._new) return;
        const lineGroup = _this.entityLines.filter(f => key(f) == key(d));
        _this.positionLabel(d, null, this, 0, null, lineGroup);
      });
    });
  }

  updateLabelOnlyPosition(d, index, cache) {
    const _this = this;
    const cached = this.cached[key(d)];
    if (cache) utils.extend(cached, cache);

    const lineGroup = _this.entityLines.filter(f => key(f) == key(d));

    this.entityLabels.filter(f => key(f) == key(d))
      .each(function() {
        _this.positionLabel(d, null, this, 0, null, lineGroup);
      });
  }

  updateLabelOnlyColor(d, index, cache) {
    const _this = this;
    const cached = this.cached[key(d)];
    if (cache) utils.extend(cached, cache);

    const labelGroup = _this.entityLabels.filter(f => key(f) == key(d));

    _this._updateLabelSize(d, null, labelGroup, null);

  }

  positionLabel(d, cache, context, duration, showhide, lineGroup, position) {
    if (key(d) == this.dragging) return;
    
    const cached = cache || this.cached[key(d)];

    const lockPosition = (position || position === 0);
    const hPos = (position || 0) & 1;
    const vPos = ((position || 0) & 2) >> 1;
    let hPosNew = 0;
    let vPosNew = 0;
    const viewWidth = this.context.width;
    const viewHeight = this.context.height;

    const resolvedX0 = this.xScale(cached.labelX0);
    const resolvedY0 = this.yScale(cached.labelY0);

    const offsetX = cached.rectOffsetX;
    const offsetY = cached.rectOffsetY;

    if (!cached.labelOffset) cached.labelOffset = [0, 0];

    cached.labelX_ = cached.labelOffset[0] || (-cached.scaledS0 * 0.75 - offsetX) / viewWidth;
    cached.labelY_ = cached.labelOffset[1] || (-cached.scaledS0 * 0.75 - offsetY) / viewHeight;

    //check default label position and switch to mirror position if position
    //does not bind to visible field
    let resolvedX = resolvedX0 + cached.labelX_ * viewWidth;
    let resolvedY = resolvedY0 + cached.labelY_ * viewHeight;
    if (cached.labelOffset[0] + cached.labelOffset[1] == 0) {
      if ((!lockPosition && (resolvedY - cached.rectBBox.height + offsetY <= 0)) || vPos) { // check top
        vPosNew = 1;
        cached.labelY_ = (cached.scaledS0 * 0.75 + cached.rectBBox.height - offsetY) / viewHeight;
        resolvedY = resolvedY0 + cached.labelY_ * viewHeight;
      }
      //  else if (resolvedY + 10 > viewHeight) { //check bottom
      //   cached.labelY_ = (viewHeight - 10 - resolvedY0) / viewHeight;
      //   resolvedY = resolvedY0 + cached.labelY_ * viewHeight;
      // }

      if ((!lockPosition && (resolvedX - cached.rectBBox.width + offsetX <= 0)) || hPos) { //check left
        hPosNew = 1;
        cached.labelX_ = (cached.scaledS0 * 0.75 + cached.rectBBox.width - offsetX) / viewWidth;
        resolvedX = resolvedX0 + cached.labelX_ * viewWidth;
        if (resolvedX > viewWidth) {
          hPosNew = 0;
          vPosNew = (vPosNew == 0 && (resolvedY0 - offsetY * 0.5 - cached.scaledS0) < cached.rectBBox.height) ? 1 : vPosNew;
          cached.labelY_ = vPosNew ? -offsetY * 0.5 + cached.rectBBox.height + cached.scaledS0 : -offsetY * 1.5 - cached.scaledS0;
          cached.labelY_ /= viewHeight;
          resolvedY = resolvedY0 + cached.labelY_ * viewHeight;
          cached.labelX_ = (cached.rectBBox.width - offsetX - resolvedX0) / viewWidth;
          resolvedX = resolvedX0 + cached.labelX_ * viewWidth;
        }

      }
      //  else if (resolvedX + 15 > viewWidth) { //check right
      //   cached.labelX_ = (viewWidth - 15 - resolvedX0) / viewWidth;
      //   resolvedX = resolvedX0 + cached.labelX_ * viewWidth;
      // }
    }

    if (lockPosition) {
      let topCornerCase = false;
      if (resolvedX - cached.rectBBox.width + offsetX <= 0) {
        const deltaX = resolvedX0 - cached.rectBBox.width;
        const deltaY = deltaX > 0 ? utils.cathetus(cached.scaledS0, deltaX) : cached.scaledS0;
        resolvedY = vPosNew ?
          resolvedY0 + cached.rectBBox.height - offsetY * 0.5 + deltaY
          :
          resolvedY0 - offsetY * 1.5 - deltaY;
        if (resolvedY - cached.rectBBox.height < 0) {
          topCornerCase = true;
        }
      }
      if (resolvedY - cached.rectBBox.height + offsetY <= 0) {
        const deltaY = resolvedY0 - cached.rectBBox.height;
        const deltaX = deltaY > 0 ? utils.cathetus(cached.scaledS0, deltaY) : cached.scaledS0;
        resolvedX = hPosNew ?
          resolvedX0 + cached.rectBBox.width + deltaX
          :
          resolvedX0 - offsetX * 2 - deltaX;
        if (resolvedX - cached.rectBBox.width < 0 || resolvedX > viewWidth) {
          topCornerCase = true;
        }
      }
      if (topCornerCase) {
        vPosNew++;
        const deltaX = resolvedX0 - cached.rectBBox.width;
        resolvedY = resolvedY0 + cached.rectBBox.height - offsetY * 0.5 + (deltaX > 0 ? utils.cathetus(cached.scaledS0, deltaX) : cached.scaledS0);
      }
    }

    this.label._repositionLabels(d, cache, context, resolvedX, resolvedY, resolvedX0, resolvedY0, duration, showhide, lineGroup);

    return vPosNew * 2 + hPosNew;
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = (this.element.node().clientHeight) || 0;
    this.width = (this.element.node().clientWidth) || 0;
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }





  LABEL(context) {

    return (function d3_label() {

      const _this = context;

      let _cssPrefix;
      label.setCssPrefix = function(cssPrefix) {
        _cssPrefix = cssPrefix;
        return label;
      };

      const labelDragger = d3.drag()
        .on("start", event => {
          event.sourceEvent.stopPropagation();
        })
        .on("drag", function(event, d) {
          if (!_this.ui.dragging) return;
          if (!_this.dragging) _this.dragging = key(d);
          const cache = _this.cached[key(d)];
          cache.labelFixed = true;

          const viewWidth = _this.context.width;
          const viewHeight = _this.context.height;

          cache.labelX_ += event.dx / viewWidth;
          cache.labelY_ += event.dy / viewHeight;

          const resolvedX = _this.xScale(cache.labelX0) + cache.labelX_ * viewWidth;
          const resolvedY = _this.yScale(cache.labelY0) + cache.labelY_ * viewHeight;

          const resolvedX0 = _this.xScale(cache.labelX0);
          const resolvedY0 = _this.yScale(cache.labelY0);

          const lineGroup = _this.entityLines.filter(f => key(f) == key(d));

          label._repositionLabels(d, null, this, resolvedX, resolvedY, resolvedX0, resolvedY0, 0, null, lineGroup);
        })
        .on("end", (event, d) => {
          if (_this.dragging) {
            const cache = _this.cached[key(d)];
            _this.dragging = null;
            cache.labelOffset[0] = cache.labelX_;
            cache.labelOffset[1] = cache.labelY_;
            //marker model is a wrong place to save those, maybe labels ui is a better place
            //in form of this.ui.offset = {"geo-afg":[dx, dy]} 
            //_this.model.setLabelOffset(d, [cache.labelX_, cache.labelY_]);
            _this.ui.offset = Object.assign(_this.ui.offset, {[key(d)]: [cache.labelX_, cache.labelY_]});
            //_this.ui.offset[key(d)] = [cache.labelX_, cache.labelY_];
            //_this.ui.offset = {[key(d)]: [cache.labelX_, cache.labelY_]};
          }
        });

      function label(container, isTooltip) {

        container
          .each(function(d) {
            const view = d3.select(this);

            // Ola: Clicking bubble label should not zoom to countries boundary #811
            // It's too easy to accidentally zoom
            // This feature will be activated later, by making the label into a "context menu" where users can click Split, or zoom,.. hide others etc....

            view.append("rect")
              .attr("class", "vzb-label-glow")
              .attr("filter", `url(#vzb-glow-filter-${parent.id}})`);
            view.append("rect")
              .attr("class", "vzb-label-fill vzb-tooltip-border");
            //          .on("click", function(event, d) {
            //            //default prevented is needed to distinguish click from drag
            //            if(event.defaultPrevented) return;
            //
            //            var maxmin = _this.cached[key(d)].maxMinValues;
            //            var radius = utils.areaToRadius(_this.sScale(maxmin.valueSmax));
            //            _this._panZoom._zoomOnRectangle(_this.element,
            //              _this.xScale(maxmin.valueXmin) - radius,
            //              _this.yScale(maxmin.valueYmin) + radius,
            //              _this.xScale(maxmin.valueXmax) + radius,
            //              _this.yScale(maxmin.valueYmax) - radius,
            //              false, 500);
            //          });

            const text = view.append("text").attr("class", _cssPrefix + "-label-content stroke");
            if (!view.style("paint-order").length) {
              view.insert("text", `.${_cssPrefix}-label-content`)
                .attr("class", _cssPrefix + "-label-content " + _cssPrefix + "-label-shadow vzb-noexport");

              text.classed("stroke", false);
            }

            if (!isTooltip) {
              const cross = view.append("g").attr("class", _cssPrefix + "-label-x vzb-transparent");
              utils.setIcon(cross, iconClose);

              cross.insert("circle", "svg");

              cross.select("svg")
                .attr("class", _cssPrefix + "-label-x-icon")
                .attr("width", "0px")
                .attr("height", "0px");

              cross.on("click", event => {
                //default prevented is needed to distinguish click from drag
                if (event.defaultPrevented) return;
                event.stopPropagation();
                _this.MDL.highlighted.delete(d);
                _this.MDL.selected.delete(d);
              });
            }

          });

        if (!isTooltip) {
          container
            .call(labelDragger)
            .on("mouseenter", function(event, d) {
              if (utils.isTouchDevice() || _this.dragging) return;
              _this.MDL.highlighted.set(d);
              // hovered label should be on top of other labels: if "a" is not the hovered element "d", send "a" to the back
              _this.entityLabels.sort((a) => key(a) != key(d) ? -1 : 1);
              d3.select(this).selectAll("." + _cssPrefix + "-label-x")
                .classed("vzb-transparent", false);
            })
            .on("mouseleave", function(event, d) {
              if (utils.isTouchDevice() || _this.dragging) return;
              _this.MDL.highlighted.delete(d);
              d3.select(this).selectAll("." + _cssPrefix + "-label-x")
                .classed("vzb-transparent", true);
            })
            .on("click", function(event, d) {
              if (!utils.isTouchDevice()) return;
              const cross = d3.select(this).selectAll("." + _cssPrefix + "-label-x");
              const hidden = cross.classed("vzb-transparent");
              if (hidden) {
                // hovered label should be on top of other labels: if "a" is not the hovered element "d", send "a" to the back
                _this.entityLabels.sort((a) => key(a) != key(d) ? -1 : 1);
                _this.showCloseCross(null, false);
              }
              cross.classed("vzb-transparent", !hidden);
              if (!_this.options.SUPPRESS_HIGHLIGHT_DURING_PLAY || !_this.MDL.frame.playing) {
                if (hidden) {
                  _this.MDL.highlighted.set(d);
                } else {
                  _this.MDL.highlighted.delete(d);
                }
              }
            });
        }

        return label;
      }

      label.line = function(container) {
        container.append("line").attr("class", _cssPrefix + "-label-line");
      };


      label._repositionLabels = _repositionLabels;
      function _repositionLabels(d, _cache, labelContext, _X, _Y, _X0, _Y0, duration, showhide, lineGroup) {

        const cache = _cache || _this.cached[key(d)];

        const labelGroup = d3.select(labelContext);

        //protect label and line from the broken data
        const brokenInputs = !_X && _X !== 0 || !_Y && _Y !== 0 || !_X0 && _X0 !== 0 || !_Y0 && _Y0 !== 0;
        if (brokenInputs) {
          labelGroup.classed("vzb-invisible", brokenInputs);
          lineGroup.classed("vzb-invisible", brokenInputs);
          return;
        }

        const viewWidth = _this.context.width;
        const viewHeight = _this.context.height;
        const rectBBox = cache.rectBBox;
        const height = rectBBox.height;
        const offsetX = cache.rectOffsetX;
        const offsetY = cache.rectOffsetY;

        //apply limits so that the label doesn't stick out of the visible field
        if (_X + rectBBox.x <= 0) { //check left
          _X = -rectBBox.x;
          cache.labelX_ = (_X - _this.xScale(cache.labelX0)) / viewWidth;
        } else if (_X + offsetX > viewWidth) { //check right
          _X = viewWidth - offsetX;
          cache.labelX_ = (_X - _this.xScale(cache.labelX0)) / viewWidth;
        }
        if (_Y + rectBBox.y <= 0) { // check top
          _Y = -rectBBox.y;
          cache.labelY_ = (_Y - _this.yScale(cache.labelY0)) / viewHeight;
        } else if (_Y + offsetY > viewHeight) { //check bottom
          _Y = viewHeight - offsetY;
          cache.labelY_ = (_Y - _this.yScale(cache.labelY0)) / viewHeight;
        }
        // if (_Y - height * 0.75 <= 0) { // check top
        //   _Y = height * 0.75;
        //   cache.labelY_ = (_Y - _this.yScale(cache.labelY0)) / viewHeight;
        // } else if (_Y + height * 0.35 > viewHeight) { //check bottom
        //   _Y = viewHeight - height * 0.35;
        //   cache.labelY_ = (_Y - _this.yScale(cache.labelY0)) / viewHeight;
        // }

        if (duration == null) duration = _this.context.duration;
        if (cache._new) {
          duration = 0;
          delete cache._new;
        }
        if (duration) {
          if (showhide && !d.hidden) {
            //if need to show label

            labelGroup.classed("vzb-invisible", d.hidden);
            labelGroup
              .attr("transform", "translate(" + _X + "," + _Y + ")")
              .style("opacity", 0)
              .transition().duration(duration).ease(d3.easeExp)
              .style("opacity", 1)
            //i would like to set opactiy to null in the end of transition.
            //but then fade in animation is not working for some reason
              .on("interrupt", () => {
                labelGroup
                  .style("opacity", 1);
              });
            lineGroup.classed("vzb-invisible", d.hidden);
            lineGroup
              .attr("transform", "translate(" + _X + "," + _Y + ")")
              .style("opacity", 0)
              .transition().duration(duration).ease(d3.easeExp)
              .style("opacity", 1)
            //i would like to set opactiy to null in the end of transition.
            //but then fade in animation is not working for some reason
              .on("interrupt", () => {
                lineGroup
                  .style("opacity", 1);
              });

          } else if (showhide && d.hidden) {
            //if need to hide label

            labelGroup
              .style("opacity", 1)
              .transition().duration(duration).ease(d3.easeExp)
              .style("opacity", 0)
              .on("end", () => {
                labelGroup
                  .style("opacity", 1) //i would like to set it to null. but then fade in animation is not working for some reason
                  .classed("vzb-invisible", d.hidden);
              });
            lineGroup
              .style("opacity", 1)
              .transition().duration(duration).ease(d3.easeExp)
              .style("opacity", 0)
              .on("end", () => {
                lineGroup
                  .style("opacity", 1) //i would like to set it to null. but then fade in animation is not working for some reason
                  .classed("vzb-invisible", d.hidden);
              });

          } else {
            // just update the position

            labelGroup
              .transition().duration(duration).ease(d3.easeLinear)
              .attr("transform", "translate(" + _X + "," + _Y + ")");
            lineGroup
              .transition().duration(duration).ease(d3.easeLinear)
              .attr("transform", "translate(" + _X + "," + _Y + ")");
          }

        } else {
          labelGroup
            .interrupt()
            .attr("transform", "translate(" + _X + "," + _Y + ")")
            .transition();
          lineGroup
            .interrupt()
            .attr("transform", "translate(" + _X + "," + _Y + ")")
            .transition();
          if (showhide) labelGroup.classed("vzb-invisible", d.hidden);
          if (showhide) lineGroup.classed("vzb-invisible", d.hidden);
        }

        const diffX1 = _X0 - _X;
        const diffY1 = _Y0 - _Y;
        const textBBox = cache.textBBox;
        let diffX2 = -textBBox.width * 0.5;
        let diffY2 = -height * 0.2;
        const labels = _this.root.ui.chart.labels;

        const bBox = labels.removeLabelBox ? textBBox : rectBBox;

        const FAR_COEFF = _this.profileConstants.labelLeashCoeff || 0;

        const lineHidden = circleRectIntersects({ x: diffX1, y: diffY1, r: cache.scaledS0 },
          { x: diffX2, y: diffY2, width: (bBox.height * 2 * FAR_COEFF + bBox.width), height: (bBox.height * (2 * FAR_COEFF + 1)) });
        lineGroup.select("line").classed("vzb-invisible", lineHidden);
        if (lineHidden) return;

        if (labels.removeLabelBox) {
          const angle = Math.atan2(diffX1 - diffX2, diffY1 - diffY2) * 180 / Math.PI;
          const deltaDiffX2 = (angle >= 0 && angle <= 180) ? (bBox.width * 0.5) : (-bBox.width * 0.5);
          const deltaDiffY2 = (Math.abs(angle) <= 90) ? (bBox.height * 0.55) : (-bBox.height * 0.45);
          diffX2 += Math.abs(diffX1 - diffX2) > textBBox.width * 0.5 ? deltaDiffX2 : 0;
          diffY2 += Math.abs(diffY1 - diffY2) > textBBox.height * 0.5 ? deltaDiffY2 : (textBBox.height * 0.05);
        }

        const longerSideCoeff = Math.abs(diffX1) > Math.abs(diffY1) ? Math.abs(diffX1) : Math.abs(diffY1);
        lineGroup.select("line").style("stroke-dasharray", "0 " + (cache.scaledS0) + " " + ~~(longerSideCoeff) * 2);

        if (duration) {
          lineGroup.selectAll("line")
            .transition().duration(duration).ease(d3.easeLinear)
            .attr("x1", diffX1)
            .attr("y1", diffY1)
            .attr("x2", diffX2)
            .attr("y2", diffY2);
        } else {
          lineGroup.selectAll("line")
            .interrupt()
            .attr("x1", diffX1)
            .attr("y1", diffY1)
            .attr("x2", diffX2)
            .attr("y2", diffY2)
            .transition();
        }

      }

      /*
      * Adapted from
      * http://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection
      *
      * circle {
      *  x: center X
      *  y: center Y
      *  r: radius
      * }
      *
      * rect {
      *  x: center X
      *  y: center Y
      *  width: width
      *  height: height
      * }
      */
      function circleRectIntersects(circle, rect) {
        const circleDistanceX = Math.abs(circle.x - rect.x);
        const circleDistanceY = Math.abs(circle.y - rect.y);
        const halfRectWidth = rect.width * 0.5;
        const halfRectHeight = rect.height * 0.5;

        if (circleDistanceX > (halfRectWidth + circle.r)) { return false; }
        if (circleDistanceY > (halfRectHeight + circle.r)) { return false; }

        if (circleDistanceX <= halfRectWidth) { return true; }
        if (circleDistanceY <= halfRectHeight) { return true; }

        const cornerDistance_sq = Math.pow(circleDistanceX - halfRectWidth, 2) +
                            Math.pow(circleDistanceY - halfRectHeight, 2);

        return (cornerDistance_sq <= Math.pow(circle.r, 2));
      }

      return label;
    })();
  }
}


Labels.DEFAULT_UI = {
  offset: () => ({}),
  enabled: true,
  dragging: true,
  removeLabelBox: false
};

const decorated = decorate(Labels, {
  "MDL": computed
});
export { decorated as Labels };