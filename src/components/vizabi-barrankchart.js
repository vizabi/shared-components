import BaseComponent from "./base-component.js";
import "./vizabi-barrankchart.scss";
import * as utils from "./legacy/base/utils";
import {ICON_WARN, ICON_QUESTION} from "../assets/icons/iconset.js";

const COLOR_BLACKISH = "rgb(51, 51, 51)";
const COLOR_WHITEISH = "rgb(253, 253, 253)";

const ANIMATION_DURATION = 500;

const PROFILE_CONSTANTS = {
  SMALL: {
    margin: {top: 60, right: 20, left: 5, bottom: 20},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 16,
    infoElMargin: 5,
    barHeight: 18,
    barMargin: 3,
    barLabelMargin: 5,
    barValueMargin: 5,
    barRankMargin: 6,
    scrollMargin: 25,
  },
  MEDIUM: {
    margin: {top: 60, right: 25, left: 5, bottom: 20},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 16,
    infoElMargin: 5,
    barHeight: 21,
    barMargin: 3,
    barLabelMargin: 5,
    barValueMargin: 5,
    barRankMargin: 10,
    scrollMargin: 30,
  },
  LARGE: {
    margin: {top: 60, right: 30, left: 5, bottom: 20},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 16,
    infoElMargin: 5,
    barHeight: 28,
    barMargin: 4,
    barLabelMargin: 5,
    barValueMargin: 5,
    barRankMargin: 10,
    scrollMargin: 30,
  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    margin: {top: 60, right: 30, left: 10, bottom: 40},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 25,
    infoElMargin: 10,
    barHeight: 25,
    barMargin: 6
  },
  LARGE: {
    margin: {top: 60, right: 35, left: 10, bottom: 40},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 16,
    infoElMargin: 10,
    barHeight: 30,
    barMargin: 6
  }
};

export default class VizabiBarrankchart extends BaseComponent {

  constructor(config) {
    config.template = `
      <div class="vzb-tool vzb-tool-barrankchart vzb-portrait vzb-medium">
      <div class="vzb-tool-stage">
      <div class="vzb-tool-viz">
      <div class="vzb-barrankchart">
        <svg class="vzb-br-header">
          <g class="vzb-br-title">
            <text></text>
          </g>
          <g class="vzb-br-total">
            <text></text>
          </g>
          <g class="vzb-br-axis-info vzb-noexport"></g>
        </svg>

        <div class="vzb-br-barsviewport vzb-dialog-scrollable">
          <svg class="vzb-br-bars-svg vzb-export">
            <g class="vzb-br-bars"></g>
            <rect class="vzb-br-forecastoverlay vzb-hidden" x="0" y="0" width="100%" height="100%" fill="url(#vzb-br-pattern-lines)" pointer-events='none'></rect>
          </svg>
        </div>

        <svg class="vzb-data-warning-svg">
          <g class="vzb-data-warning vzb-noexport">
            <svg></svg>
            <text></text>
          </g>
          <g class="vzb-data-warning vzb-data-warning-missed-positions">
            <text></text>
          </g>
        </svg>

        <svg class="vzb-br-tooltip-svg vzb-hidden">
          <g class="vzb-br-tooltip vzb-hidden">
            <rect class="vzb-tooltip-border"></rect>
            <text class="vzb-tooltip-text"></text>
          </g>
        </svg>
        
        <svg>
          <defs>
              <pattern id="vzb-br-pattern-lines" x="0" y="0" patternUnits="userSpaceOnUse" width="50" height="50" viewBox="0 0 10 10"> 
                  <path d='M-1,1 l2,-2M0,10 l10,-10M9,11 l2,-2' stroke='black' stroke-width='3' opacity='0.08'/>
              </pattern> 
          </defs>
      </svg>
      </div>
      </div>
      </div>
      </div>
    `;
    super(config);
  }


  setup() {
    this.state = {
      showForecastOverlay: false,
      opacityHighlightDim: 0.1,
      opacitySelectDim: 0.3,
      opacityRegular: 1,
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      }
    };

    this.DOM = {
      header: this.element.select(".vzb-br-header"),
      title: this.element.select(".vzb-br-title"),
      total: this.element.select(".vzb-br-total"),
      info: this.element.select(".vzb-br-axis-info"),
  
      barViewport: this.element.select(".vzb-br-barsviewport"),
      barSvg: this.element.select(".vzb-br-bars-svg"),
      barContainer: this.element.select(".vzb-br-bars"),
      forecastOverlay: this.element.select(".vzb-br-forecastoverlay"),
  
      footer: this.element.select(".vzb-data-warning-svg"),
      dataWarning: this.element.select(".vzb-data-warning"),
      missedPositionsWarning: this.element.select(".vzb-data-warning-missed-positions"),
  
      tooltipSvg: this.element.select(".vzb-br-tooltip-svg"),
      tooltip: this.element.select(".vzb-br-tooltip")
    };

    this.wScale = d3.scaleLinear()
      .domain(this.state.datawarning.doubtDomain)
      .range(this.state.datawarning.doubtRange);

    this._cache = {};
  }
  
  draw(data) {
    //JASPER: i can't move this to "setup", ideally would avoid running getters on each time ticklk
    this.MDL = {
      frame: this.model.encoding.get("frame"),
      selected: this.model.encoding.get("selected").data.filter,
      highlighted: this.model.encoding.get("highlighted").data.filter,
      x: this.model.encoding.get("x"),
      color: this.model.encoding.get("color"),
      label: this.model.encoding.get("label")
    };
    this.localise = this.services.locale.auto();

    // new scales and axes
    this.xScale = this.MDL.x.scale.d3Scale.copy();
    this.cScale = this.MDL.color.scale.d3Scale;


    
    this.addReaction("_drawForecastOverlay");
    
    if (this._updateLayoutProfile()) return; //return if exists with error
    this.addReaction("_getDuration");
    this.addReaction("_drawHeader");
    this.addReaction("_drawInfoEl");
    this.addReaction("_drawFooter");

    //this.addReaction("_processFrameData");
    //this.addReaction("_createAndDeleteBars");
    this.addReaction("_drawData");
    this.addReaction("_updateOpacity");
    this.addReaction("_resizeSvg");
    this.addReaction("_scroll");
    this.addReaction("_drawColors");

    this.addReaction("_updateDataWarning");
    this.addReaction("_updateMissedPositionWarning");
    
  }

  _getDuration() {
    //smooth animation is needed when playing, except for the case when time jumps from end to start
    if(!this.MDL.frame) return 0;
    this.frameValue_1 = this.frameValue;
    this.frameValue = this.MDL.frame.value;
    return this.__duration = this.MDL.frame.playing && (this.frameValue - this.frameValue_1 > 0) ? ANIMATION_DURATION : 0;
  }
  
  _drawForecastOverlay() {
    this.DOM.forecastOverlay.classed("vzb-hidden", 
      !this.MDL.frame.endBeforeForecast || 
      !this.state.showForecastOverlay || 
      (this.MDL.frame.value <= this.MDL.frame.endBeforeForecast)
    );
  }

  _updateLayoutProfile(){
    this.services.layout.width + this.services.layout.height;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  _drawHeader(duration = 0) {
    const {
      margin,
      headerMargin,
      infoElHeight,
      infoElMargin,
    } = this.profileConstants;



    // header
    this.DOM.header.attr("height", margin.top);
    const headerTitle = this.DOM.title;

    // change header titles for new data
    const { name, unit } = this.MDL.x.data.conceptProps;

    const headerTitleText = headerTitle.select("text");

    if (unit) {
      headerTitleText.text(`${name}, ${unit}`);

      const rightEdgeOfLeftText = headerMargin.left
        + headerTitle.node().getBBox().width
        + infoElMargin
        + infoElHeight;

      if (rightEdgeOfLeftText > this.width - headerMargin.right) {
        headerTitleText.text(name);
      }
    } else {
      headerTitleText.text(name);
    }

    const headerTitleBBox = headerTitle.node().getBBox();

    const titleTx = headerMargin.left;
    const titleTy = headerMargin.top + headerTitleBBox.height;
    headerTitle
      .attr("transform", `translate(${titleTx}, ${titleTy})`);

    const headerInfo = this.DOM.info;

    headerInfo.select("svg")
      .attr("width", `${infoElHeight}px`)
      .attr("height", `${infoElHeight}px`);

    const infoTx = titleTx + headerTitle.node().getBBox().width + infoElMargin;
    const infoTy = headerMargin.top + infoElHeight / 4;
    headerInfo.attr("transform", `translate(${infoTx}, ${infoTy})`);


    const headerTotal = this.DOM.total;

    if (duration) {
      headerTotal.select("text")
        .transition("text")
        .delay(duration)
        .text(this.localise(this.MDL.frame.value));
    } else {
      headerTotal.select("text")
        .interrupt()
        .text(this.localise(this.MDL.frame.value));
    }
    headerTotal.classed("vzb-hidden", this.services.layout.profile !== "LARGE");

    const headerTotalBBox = headerTotal.node().getBBox();

    const totalTx = this.width - headerMargin.right - headerTotalBBox.width;
    const totalTy = headerMargin.top + headerTotalBBox.height;
    headerTotal
      .attr("transform", `translate(${totalTx}, ${totalTy})`)
      .classed("vzb-transparent", headerTitleBBox.width + headerTotalBBox.width + 10 > this.width);



    this.DOM.title
      .on("click", () =>
        this.root.findChild({type: "gapminder-treemenu"})
          .markerID("axis_x")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle()
      );

  }

  _drawInfoEl(){
    const dataNotes = this.root.findChild({type: "gapminder-datanotes"});
    const conceptPropsX = this.MDL.x.data.conceptProps;

    this.DOM.info
      .on("click", () => {
        dataNotes.pin();
      })
      .on("mouseover", () => {
        const rect = this.getBBox();
        const ctx = utils.makeAbsoluteContext(this, this.farthestViewportElement);
        const coord = ctx(rect.x - 10, rect.y + rect.height + 10);
        dataNotes
          .setConceptProps(conceptPropsX)
          .show()
          .setPos(coord.x, coord.y);
      })
      .on("mouseout", () => {
        dataNotes.hide();
      })
      .html(ICON_QUESTION)
      .select("svg").attr("width", 0).attr("height", 0)
      .classed("vzb-hidden", !conceptPropsX.description && !conceptPropsX.sourceLink);
  }

  _drawFooter(){
    const { margin } = this.profileConstants;

    this.DOM.footer
      .style("height", `${margin.bottom}px`);

    const warningBBox = this.DOM.dataWarning.select("text").node().getBBox();
    this.DOM.dataWarning
      .attr("transform", `translate(${this.width - margin.right - warningBBox.width}, ${warningBBox.height})`);

    this.DOM.dataWarning
      .select("svg")
      .attr("width", warningBBox.height)
      .attr("height", warningBBox.height)
      .attr("x", -warningBBox.height - 5)
      .attr("y", -warningBBox.height + 1);    

    this.DOM.dataWarning.html(ICON_WARN)
      .select("svg")
      .attr("width", 0).attr("height", 0);

    this.DOM.dataWarning.append("text")
      .text(this.localise("hints/dataWarning"));

    this.DOM.dataWarning
      .on("click", () => this.root.findChildByName("gapminder-datawarning").toggle())
      .on("mouseover", () => this._updateDataWarning(1))
      .on("mouseout", () => this._updateDataWarning());

    this.DOM.missedPositionsWarning
      .attr("transform", `translate(${this.width - margin.right - warningBBox.width - warningBBox.height * 3}, ${warningBBox.height})`);

    this.DOM.missedPositionsWarning
      .select("text")
      .attr("data-text", this.localise("hints/barrank/missedPositionsTooltip"))
      .text(this.localise("hints/barrank/missedPositionsWarning"));
  }

  _updateMissedPositionWarning() {
    this.DOM.missedPositionsWarning
      .classed("vzb-hidden", 0 && (1 - this.nullValuesCount / this.__dataProcessed.length) > 0.85);
  }

  _updateDataWarning(opacity) {
    this.DOM.dataWarning.style("opacity",
      1 || opacity || (
        !this.MDL.selected.markers.size ?
          this.wScale(this.MDL.frame.value.getUTCFullYear()) :
          1
      )
    );
  }

  _getLabelText(d) {
    if (!d.label) return d[Symbol.for("key")];
    let label = (typeof d.label === "string") ? d.label : Object.keys(d.label).join(", ");
    if (label.length >= 12) label = `${label.substring(0, 11)}…`;
    return label;
  }

  _processFrameData() {
    this.nullValuesCount = 0;

    return this.__dataProcessed = this.model.dataArray
      //copy array in order to not sort in place
      .concat()
      //sort array by x value
      .sort((a, b) => d3.descending(a.x, b.x))
      //reduce allows looking at the previous value to calcaulte the rank, as we go
      .reduce((result, d, index) => {
        const id = d[Symbol.for("key")];
        const cached = this._cache[id];
        const value = d.x;
        if (!value && value !== 0) this.nullValuesCount++;
        const formattedValue = this.localise(value);
        const formattedLabel = this._getLabelText(d);
        const rank = !index || result[index - 1].formattedValue !== formattedValue ? index + 1 : result[index - 1].rank;
  
        if (cached) {
          result.push(Object.assign(cached, {
            value,
            formattedValue,
            formattedLabel,
            index,
            rank,
            changedFormattedValue: formattedValue !== cached.formattedValue,
            changedValue: value !== cached.value,
            changedIndex: index !== cached.index,
            isNew: false
          }));
        } else {
          result.push(this._cache[id] = Object.assign({}, d, {
            value,
            formattedValue,
            formattedLabel,
            index,
            rank,
            changedFormattedValue: true,
            changedValue: true,
            changedIndex: true,
            isNew: true
          }));
        }

        return result;
      }, []);
  }

  _drawData(duration = 500, force = true) {
    duration = 200;
    this._processFrameData();
    this._createAndDeleteBars();
    
    const valuesCount = this.__dataProcessed.length;
    if (!valuesCount) return false;

    
    const { barLabelMargin, barValueMargin, barRankMargin, scrollMargin, margin } = this.profileConstants;
    let limits = this.MDL.x.scale.domain;
    limits = {min: d3.min(limits), max: d3.max(limits)};
    const ltr = Math.abs(limits.max) >= Math.abs(limits.min);
    const hasNegativeValues = ltr ? limits.min < 0 : limits.max > 0;


    const rightEdge = (
      this.width
      - margin.right
      - margin.left
      - barLabelMargin
      - scrollMargin
      - (hasNegativeValues ? 0 : this._getWidestLabelWidth())
    ) / (hasNegativeValues ? 2 : 1);

    this.xScale
      .range([0, rightEdge]);
    
    if (this.MDL.x.scale.type !== "log") {
      this.xScale
        .domain([0, Math.max(...this.xScale.domain())]);
    }

    const shift = hasNegativeValues ? rightEdge : this._getWidestLabelWidth();

    const barWidth = (value) => this.xScale(value);
    const isLtrValue = value => ltr ? value >= 0 : value > 0;

    const labelAnchor = value => isLtrValue(value) ? "end" : "start";
    const valueAnchor = value => isLtrValue(value) ? "start" : "end";

    const labelX = value => isLtrValue(value) ? -barLabelMargin : barLabelMargin;

    const valueX = value => isLtrValue(value) ? barValueMargin : -barValueMargin;

    const isLabelBig = (this._getWidestLabelWidth(true) + (ltr ? margin.left : margin.right)) < shift;

    this.DOM.barContainer.attr("transform", `translate(${shift + (ltr ? margin.left : margin.right) + barLabelMargin}, 0)`);

    
    this.__dataProcessed.forEach((bar) => {
      const { value } = bar;

    
      
      // const labelWidth = barLabel.text(label).node().getBBox().width;
      // const labelSmallWidth = barLabel.text(labelSmall).node().getBBox().width;

      // Object.assign(d, {
      //   labelWidth,
      //   labelSmallWidth,
      //   labelSmall,
      //   barLabel,
      // });

      if (force || bar.isNew || bar.changedFormattedValue) {
        bar.DOM.label
          .attr("x", labelX(value))
          .attr("y", this.profileConstants.barHeight / 2)
          .attr("text-anchor", labelAnchor(value))
          .text(bar.formattedLabel);

        bar.DOM.rect
          .attr("rx", this.profileConstants.barHeight / 4)
          .attr("ry", this.profileConstants.barHeight / 4)
          .attr("height", this.profileConstants.barHeight);

        bar.DOM.value
          .attr("x", valueX(value))
          .attr("y", this.profileConstants.barHeight / 2)
          .attr("text-anchor", valueAnchor(value));

        bar.DOM.rank          
          .text((d) => value || value === 0 ? "#" + d.rank : "")
          .attr("y", this.profileConstants.barHeight / 2);
      }

      if (force || bar.changedValue) {
        const width = Math.max(0, value && barWidth(Math.abs(value))) || 0;

        if (force || bar.changedFormattedValue) {
          bar.DOM.value
            .text(this.localise(value) || this.localise("hints/nodata"));
          bar.barValueWidth = barValueMargin + bar.DOM.value.node().getBBox().width;
        }

        if (force || bar.changedValue) {
          bar.DOM.rect
            .transition().duration(duration).ease(d3.easeLinear)
            .attr("width", width);
          bar.DOM.rank
            .transition().duration(duration).ease(d3.easeLinear)
            .attr("x", (Math.max(width, bar.barValueWidth) + barRankMargin) * (isLtrValue(value) ? 1 : -1))
            .attr("text-anchor", valueAnchor(value));
        }

        bar.DOM.rect
          .attr("x", value < 0 ? -width : 0);
      }

      if (force || bar.changedIndex) {
        !duration && bar.DOM.group.interrupt();
        (duration ? bar.DOM.group.transition().duration(duration).ease(d3.easeLinear) : bar.DOM.group)
          .attr("transform", `translate(0, ${this._getBarPosition(bar.index)})`);
        bar.DOM.rank          
          .text((d) => value || value === 0 ? "#" + (d.rank) : "");
      }
    });
  }

  _createAndDeleteBars() {
    const _this = this;

    const updatedBars = this.DOM.barContainer.selectAll(".vzb-br-bar")
      .data(this.__dataProcessed, d => d[Symbol.for("key")]);

    // remove groups for entities that are gone
    updatedBars.exit().remove();

    // make the groups for the entities which were not drawn yet (.data.enter() does this)
    updatedBars.enter().append("g")
      .each(function(d) {
        const id = d[Symbol.for("key")];

        const group = d3.select(this)
          .attr("class", "vzb-br-bar")
          .attr("id", `vzb-br-bar-${id}-${_this.id}`)
          .classed("vzb-selected", () => _this.MDL.selected.has(d))
          .on("mousemove", () => _this.MDL.highlighted.set(d))
          .on("mouseout", () => _this.MDL.highlighted.delete(d))
          .on("click", () => _this.MDL.selected.toggle(d));

        const label = group.append("text")
          .attr("class", "vzb-br-label")
          .attr("dy", ".325em");

        const rect = group.append("rect")
          .attr("stroke", "transparent");

        const value = group.append("text")
          .attr("class", "vzb-br-value")
          .attr("dy", ".325em");

        const rank = group.append("text")
          .attr("class", "vzb-br-rank")
          .attr("dy", ".325em");

        Object.assign(d, {
          DOM: {
            group,
            label,
            rect,
            value,
            rank
          }
        });
      });
  }

  _getWidestLabelWidth(big = false) {
    return 100;
    const widthKey = big ? "labelWidth" : "labelSmallWidth";
    const labelKey = big ? "label" : "labelSmall";

    const bar = this.__dataProcessed
      .reduce((a, b) => a[widthKey] < b[widthKey] ? b : a);

    const text = bar.barLabel.text();
    const width = bar.barLabel.text(bar[labelKey]).node().getBBox().width;
    bar.barLabel.text(text);

    return width;
  }

  _getBarPosition(i) {
    return (this.profileConstants.barHeight + this.profileConstants.barMargin) * i;
  }

  _resizeSvg() {
    const { margin, barHeight, barMargin } = this.profileConstants;

    this.DOM.barViewport
      .style("height", `${this.height - margin.bottom - margin.top}px`);

    this.DOM.barSvg
      .attr("height", `${(barHeight + barMargin) * this.__dataProcessed.length}px`);
  }


  _scroll(duration = 0) {
    const follow = this.DOM.barContainer.select(".vzb-selected");
    if (!follow.empty()) {
      const d = follow.datum();
      const yPos = this._getBarPosition(d.index);

      const { margin } = this.profileConstants;
      const height = this.height - margin.top - margin.bottom;

      const scrollTo = yPos - (height + this.profileConstants.barHeight) / 2;
      this.DOM.barViewport.transition().duration(duration)
        .tween("scrollfor" + d.entity, this._scrollTopTween(scrollTo));
    }
  }

  _scrollTopTween(scrollTop) {
    return function() {
      const node = this, i = d3.interpolateNumber(this.scrollTop, scrollTop);
      return function(t) {
        node.scrollTop = i(t);
      };
    };
  }

  _drawColors() {
    const _this = this;

    this.DOM.barContainer.selectAll(".vzb-br-bar>rect")
      .each(function(d) {
        const rect = d3.select(this);

        const colorValue = d.color;
        const isColorValid = colorValue || colorValue === 0;

        const fillColor = isColorValid ? String(_this._getColor(colorValue)) : COLOR_WHITEISH;
        const strokeColor = isColorValid ? "transparent" : COLOR_BLACKISH;

        rect.style("fill") !== fillColor && rect.style("fill", fillColor);
        rect.style("stroke") !== strokeColor && rect.style("stroke", strokeColor);
      });

    this.DOM.barContainer.selectAll(".vzb-br-bar>text")
      .style("fill", (d) => this._getDarkerColor(d.color || null));
  }

  _getColor(value) {
    return d3.rgb(this.cScale(value));
  }

  _getDarkerColor(d) {
    return this._getColor(d).darker(2);
  }

  _updateOpacity() {
    const _this = this;

    const {
      opacityHighlightDim,
      opacitySelectDim,
      opacityRegular,
    } = this.state;

    const someHighlighted = this.MDL.highlighted.markers.size > 0;
    const someSelected = this.MDL.selected.markers.size > 0;

    this.DOM.barContainer.selectAll(".vzb-br-bar")
      .style("opacity", d => {
        if (_this.MDL.highlighted.has(d)) return opacityRegular;
        if (_this.MDL.selected.has(d)) return opacityRegular;

        if (someSelected) return opacitySelectDim;
        if (someHighlighted) return opacityHighlightDim;

        return opacityRegular;
      });
  }
}