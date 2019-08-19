import BaseComponent from "./base-component.js";
import "./vizabi-barrankchart.scss";
import * as utils from "./legacy/base/utils";
import {STATUS} from "../utils";
import {ICON_WARN, ICON_QUESTION} from "../assets/icons/iconset.js";
import { autorun } from "mobx";

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
  _entities = {};
  isFirstUsage = false;

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

    this.element = d3.select(".vzb-barrankchart");
    this.header = this.element.select(".vzb-br-header");
    this.infoEl = this.element.select(".vzb-br-axis-info");
    this.barViewport = this.element.select(".vzb-br-barsviewport");
    this.barSvg = this.element.select(".vzb-br-bars-svg");
    this.barContainer = this.element.select(".vzb-br-bars");
    this.dataWarningEl = this.element.select(".vzb-data-warning");
    this.tooltipSvg = this.element.select(".vzb-br-tooltip-svg");
    this.tooltip = this.element.select(".vzb-br-tooltip");
    this.forecastOverlay = this.element.select(".vzb-br-forecastoverlay");
    this.missedPositionsWarningEl = this.element.select(".vzb-data-warning-missed-positions");

    this.wScale = d3.scaleLinear()
      .domain(this.state.datawarning.doubtDomain)
      .range(this.state.datawarning.doubtRange);

    this._entities = {};
    this.nullValuesCount = 0;
    this.cScale = d3.scaleOrdinal(d3.schemeCategory10);
  }
  
  draw(data) {
    //JASPER: i can't move this to "setup", ideally would avoid running getters on each time ticklk
    //JASPER: how to make methods more atomic? so that only the code that needs to run would get executed
    this.frameMdl = this.model.encoding.get("frame");
    this.selectedMdl = this.model.encoding.get("selected");
    this.selectedFilter = this.selectedMdl.data.filter;
    this.highlightedMdl = this.model.encoding.get("highlighted");
    this.highlightedFilter = this.highlightedMdl.data.filter;
    this.xMdl = this.model.encoding.get("x");
    this.colorMdl = this.model.encoding.get("color");
    this.labelMdl = this.model.encoding.get("label");
    this.localise = this.services.locale.auto();

    this._drawForecastOverlay();
    
    if (this._updateProfile()) return; //return if exists with error
    const duration = this._getDuration();
    this._loadData(data);
    this._drawHeaderFooter(duration);
    this._drawData(duration);
    autorun(this._updateOpacity.bind(this));
    
  }
  
  _getDuration() {
    //smooth animation is needed when playing, except for the case when time jumps from end to start
    //JASPER: add duration to frame model. or do we want to have separate animation model?
    //JASPER: date formatting?
    //MIGRATION: no this.time anymore, because frames are not only over time now
    //WHATIF: frame existed at first but then is removed from the model. will this.frameMdl get reset to null?
    if(!this.frameMdl) return 0;
    this.frame_1 = this.frame;
    this.frame = this.frameMdl.value;
    return this.frameMdl.playing && (this.frame - this.frame_1 > 0) ? ANIMATION_DURATION : 0;
  }
  
  _drawForecastOverlay() {
    this.forecastOverlay.classed("vzb-hidden", 
      //JASPER: add frame.endBeforeForecast
      !this.frameMdl.endBeforeForecast || 
      !this.state.showForecastOverlay || 
      (this.frameMdl.value <= this.frameMdl.endBeforeForecast)
    );
  }

  _updateProfile(){
    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = parseInt(this.element.style("height"), 10) || 0;
    this.width = parseInt(this.element.style("width"), 10) || 0;
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }
  
  resize(){
    if (this.status !== STATUS.READY) return; //JASPER: otherwise it fires prematurely
    //JASPER: i'm listening to updates in w and h but doing nothing with them, it's confusing
    this.services.layout.width + this.services.layout.height;

    if (this._updateProfile()) return;
    this._drawHeaderFooter();
    this._drawData();
  }

  _drawHeaderFooter(duration = 0) {


    const {
      margin,
      headerMargin,
      infoElHeight,
      infoElMargin,
    } = this.profileConstants;

    this.barViewport
      .style("height", `${this.height - margin.bottom - margin.top}px`);

    // header
    this.header.attr("height", margin.top);
    const headerTitle = this.header.select(".vzb-br-title");

    // change header titles for new data
    //MIGRATION: how to get concept props this.model.marker.axis_x.getConceptprops()
    const { name, unit } = this.xMdl.data.conceptProps;

    const headerTitleText = headerTitle
      .select("text");

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

    const headerInfo = this.infoEl;

    headerInfo.select("svg")
      .attr("width", `${infoElHeight}px`)
      .attr("height", `${infoElHeight}px`);

    const infoTx = titleTx + headerTitle.node().getBBox().width + infoElMargin;
    const infoTy = headerMargin.top + infoElHeight / 4;
    headerInfo.attr("transform", `translate(${infoTx}, ${infoTy})`);


    const headerTotal = this.header.select(".vzb-br-total");

    if (duration) {
      headerTotal.select("text")
        .transition("text")
        .delay(duration)
        .text(this.localise(this.frameMdl.value));
    } else {
      headerTotal.select("text")
        .interrupt()
        .text(this.localise(this.frameMdl.value));
    }
    headerTotal.classed("vzb-hidden", this.services.layout.profile !== "LARGE");

    const headerTotalBBox = headerTotal.node().getBBox();

    const totalTx = this.width - headerMargin.right - headerTotalBBox.width;
    const totalTy = headerMargin.top + headerTotalBBox.height;
    headerTotal
      .attr("transform", `translate(${totalTx}, ${totalTy})`)
      .classed("vzb-transparent", headerTitleBBox.width + headerTotalBBox.width + 10 > this.width);

    this.element.select(".vzb-data-warning-svg")
      .style("height", `${margin.bottom}px`);


    const warningBBox = this.dataWarningEl.select("text").node().getBBox();
    this.dataWarningEl
      .attr("transform", `translate(${this.width - margin.right - warningBBox.width}, ${warningBBox.height})`);

    this.dataWarningEl
      .select("svg")
      .attr("width", warningBBox.height)
      .attr("height", warningBBox.height)
      .attr("x", -warningBBox.height - 5)
      .attr("y", -warningBBox.height + 1);

    this.missedPositionsWarningEl
      .attr("transform", `translate(${this.width - margin.right - warningBBox.width - warningBBox.height * 3}, ${warningBBox.height})`);

    this._updateDoubtOpacity();
  }

  _updateDoubtOpacity(opacity) {
    //JASPER how to check if anything is selected?
    this.dataWarningEl.style("opacity",
      opacity || (
        //MIGRATION this.model.marker.select.length becomes...
        !this.selectedFilter.markers.size ?
          this.wScale(this.frameMdl.value.getUTCFullYear()) :
          1
      )
    );
  }


  _loadData(data) {
    const _this = this;

    //MIGRATE this.translator = this.model.locale.getTFunction();
    // sort the data (also sets this.total)
    //MIGRATE values array structure this.values.axis_x;
    const valuesCount = data.length;
    if (!valuesCount) return false;

    this.nullValuesCount = 0;
    this.sortedEntities = this._sortByIndicator(data, "x");

    this.header
      .select('.vzb-br-title')
      .select('text')
      .on('click', () =>
        this.parent
          .findChildByName('gapminder-treemenu')
          .markerID('axis_x')
          .alignX('left')
          .alignY('top')
          .updateView()
          .toggle()
      );

    // new scales and axes
    //MIGRATE this.xScale = this.model.marker.axis_x.getScale().copy();

    this.xScale = this.xMdl.scale.d3Scale.copy();
    this.cScale = this.colorMdl.scale.d3Scale;

    this.dataWarningEl.html(ICON_WARN)
      .select('svg')
      .attr('width', 0).attr('height', 0);

    this.dataWarningEl.append('text')
      .text(this.localise('hints/dataWarning'));

    this.dataWarningEl
      .on('click', () => this.parent.findChildByName('gapminder-datawarning').toggle())
      .on('mouseover', () => this._updateDoubtOpacity(1))
      .on('mouseout', () => this._updateDoubtOpacity());

    this.missedPositionsWarningEl
      .classed("vzb-hidden", (1 - this.nullValuesCount / valuesCount) > 0.85)
      .select("text")
      .attr("data-text", this.localise("hints/barrank/missedPositionsTooltip"))
      .text(this.localise("hints/barrank/missedPositionsWarning"))

    const conceptPropsX = this.xMdl.data.conceptProps;
    this.infoEl.html(ICON_QUESTION)
    //  .select('svg').attr('width', 0).attr('height', 0)
    //  .style('opacity', Number(Boolean(conceptPropsX.description || conceptPropsX.sourceLink)));

    this.infoEl.on('click', () => {
      this.parent.findChildByName('gapminder-datanotes').pin();
    });

    this.infoEl.on('mouseover', function() {
      const rect = this.getBBox();
      const ctx = utils.makeAbsoluteContext(this, this.farthestViewportElement);
      const coord = ctx(rect.x - 10, rect.y + rect.height + 10);
      _this.parent.findChildByName('gapminder-datanotes')
        .setHook('axis_x')
        .show()
        .setPos(coord.x, coord.y);
    });

    this.infoEl.on('mouseout', () => {
      _this.parent.findChildByName('gapminder-datanotes').hide();
    });

    return true;
  }

  //JASPER: my "data" has no "label". why?

  _getLabelText(d) {
    if (!d.label) return d[Symbol.for("key")];
    return (typeof d.label === "string") ? d.label : Object.keys(d.label).join(", ");
  }


  _sortByIndicator(data = [], encoding = "x") {

    return data.map(d => {
      const id = d[Symbol.for("key")];
      const cached = this._entities[id];
      const value = d[encoding];
      if (!value && value !== 0) this.nullValuesCount++;
      //JASPER: how to tell formatter that this is possibly a percentage... or time? this was easy when formatters were part of hook
      const formattedValue = this.localise(value);

      if (cached) {
        return Object.assign(cached, {
          value,
          formattedValue,
          changedValue: formattedValue !== cached.formattedValue,
          changedWidth: value !== cached.value,
          isNew: false
        });
      }

      return this._entities[id] = Object.assign({}, d, {
        value,
        formattedValue,
        changedValue: true,
        changedWidth: true,
        isNew: true
      });
    }).sort(({ value: a }, { value: b }) => (b || (b === 0 ? 0 : -Infinity)) - (a || (a === 0 ? 0 : -Infinity)))
      .map((entity, index, entities) =>
        Object.assign(entity, {
          index: index,
          rank: !index || entities[index - 1].formattedValue !== entity.formattedValue ? index + 1 : entities[index - 1].rank,
          changedIndex: index !== entity.index
        }));
  }

  _drawData(duration = 0, force = false) {
    // update the shown bars for new data-set
    this._createAndDeleteBars(
      this.barContainer.selectAll('.vzb-br-bar')
        .data(this.sortedEntities, d => d[Symbol.for("key")])
    );


    const { projector } = this.services.layout;
    const projectorModeChanged = this._projector !== projector;

    if (projectorModeChanged) {
      this._projector = projector;
    }


    const entitiesCountChanged = typeof this._entitiesCount === 'undefined'
      || this._entitiesCount !== this.sortedEntities.length;

    if (projectorModeChanged || entitiesCountChanged) {
      if (entitiesCountChanged) {
        this._entitiesCount = this.sortedEntities.length;
      }
    }

    this._resizeSvg();
    this._scroll(duration);
    this._drawColors();


    const { barLabelMargin, barValueMargin, barRankMargin, scrollMargin, margin } = this.profileConstants;
    let limits = this.xMdl.scale.domain;
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
    
      //MIGRATE scaletype
    if (this.xMdl.scale.type !== "log") {
      this.xScale
        .domain([0, Math.max(...this.xScale.domain())]);
    }

    const shift = hasNegativeValues ? rightEdge : this._getWidestLabelWidth();

    const barWidth = (value) => this.xScale(value);
    const isLtrValue = value => ltr ? value >= 0 : value > 0;

    const labelAnchor = value => isLtrValue(value) ? 'end' : 'start';
    const valueAnchor = value => isLtrValue(value) ? 'start' : 'end';

    const labelX = value => isLtrValue(value) ? -barLabelMargin : barLabelMargin;

    const valueX = value => isLtrValue(value) ? barValueMargin : -barValueMargin;

    const isLabelBig = (this._getWidestLabelWidth(true) + (ltr ? margin.left : margin.right)) < shift;

    this.barContainer.attr("transform", `translate(${shift + (ltr ? margin.left : margin.right) + barLabelMargin}, 0)`);

    this.sortedEntities.forEach((bar) => {
      const { value } = bar;

      if (force || projectorModeChanged || bar.isNew || bar.changedValue) {
        bar.barLabel
          .attr('x', labelX(value))
          .attr('y', this.profileConstants.barHeight / 2)
          .attr('text-anchor', labelAnchor(value))
          .text(isLabelBig ? this._getLabelText(bar) : bar.labelSmall);

        bar.barRect
          .attr('rx', this.profileConstants.barHeight / 4)
          .attr('ry', this.profileConstants.barHeight / 4)
          .attr('height', this.profileConstants.barHeight);

        bar.barValue
          .attr('x', valueX(value))
          .attr('y', this.profileConstants.barHeight / 2)
          .attr('text-anchor', valueAnchor(value));

        bar.barRank          
          .text((d, i) => value || value === 0 ? "#" + d.rank : "")
          .attr('y', this.profileConstants.barHeight / 2);
      }

      if (force || bar.changedWidth || projectorModeChanged) {
        const width = Math.max(0, value && barWidth(Math.abs(value))) || 0;

        if (force || bar.changedValue) {
          bar.barValue
            .text(this.localise(value) || this.localise('hints/nodata'));
          bar.barValueWidth = barValueMargin + bar.barValue.node().getBBox().width;
        }

        if (force || bar.changedWidth || projectorModeChanged) {
          bar.barRect
            .transition().duration(duration).ease(d3.easeLinear)
            .attr('width', width);
          bar.barRank
            .transition().duration(duration).ease(d3.easeLinear)
            .attr('x', (Math.max(width, bar.barValueWidth) + barRankMargin) * (isLtrValue(value) ? 1 : -1))
            .attr("text-anchor", valueAnchor(value))
        }

        bar.barRect
          .attr('x', value < 0 ? -width : 0);
      }

      if (force || bar.changedIndex || projectorModeChanged) {
        !duration && bar.self.interrupt();
        (duration ? bar.self.transition().duration(duration).ease(d3.easeLinear) : bar.self)
          .attr('transform', `translate(0, ${this._getBarPosition(bar.index)})`);
        bar.barRank          
          .text((d, i) => value || value === 0 ? "#" + (d.rank) : "");
      }
    });
  }

  _createAndDeleteBars(updatedBars) {
    const _this = this;

    // TODO: revert this commit after fixing https://github.com/vizabi/vizabi/issues/2450
    // const [entity] = this.sortedEntities;
    // if (!this._entityLabels[entity.entity]) {
    //   this._entityLabels[entity.entity] = entity.label;
    // }

    // const label = this._getLabelText(this.values, this.labelNames, entity.entity)
    // const localeChanged = this._entityLabels[entity.entity] !== label
    //   && this.model.locale.id !== this._localeId;

    // if (localeChanged) {
    //   this._localeId = this.model.locale.id;
    //   this._entityLabels[entity.entity] = label;
    // }
    const localeChanged = false;

    // remove groups for entities that are gone
    updatedBars.exit().remove();

    // make the groups for the entities which were not drawn yet (.data.enter() does this)
    updatedBars = (localeChanged ? updatedBars : updatedBars.enter().append('g'))
      .each(function(d) {
        const id = d[Symbol.for("key")];
        const self = d3.select(this);

        const label = _this._getLabelText(d);
        const labelSmall = label.length < 12 ? label : `${label.substring(0, 9)}...`;//…

        const selectedLabel = self.select('.vzb-br-label');
        const barLabel = selectedLabel.size() ?
          selectedLabel :
          self.append('text')
            .attr('class', 'vzb-br-label')
            .attr('dy', '.325em');

        const labelWidth = barLabel.text(label).node().getBBox().width;
        const labelSmallWidth = barLabel.text(labelSmall).node().getBBox().width;

        Object.assign(d, {
          labelWidth,
          labelSmallWidth,
          labelSmall,
          barLabel,
        });

        if (!localeChanged) {
          self
            .attr('class', 'vzb-br-bar')
            .classed('vzb-selected', () => _this.selectedFilter.has(d))
            .attr('id', `vzb-br-bar-${id}-${_this.id}`)
            .on('mousemove', () => _this.highlightedFilter.set(d))
            .on('mouseout', () => _this.highlightedFilter.delete(d))
            .on('click', () => _this.selectedFilter.toggle(d));

          const barRect = self.append('rect')
            .attr('stroke', 'transparent');

          const barValue = self.append('text')
            .attr('class', 'vzb-br-value')
            .attr('dy', '.325em');

          const barRank = self.append('text')
            .attr('class', 'vzb-br-rank')
            .attr('dy', '.325em');

          Object.assign(d, {
            self,
            isNew: true,
            barRect,
            barValue,
            barRank
          });
        }
      })
      .merge(updatedBars);
  }

  _getWidestLabelWidth(big = false) {
    const widthKey = big ? 'labelWidth' : 'labelSmallWidth';
    const labelKey = big ? 'label' : 'labelSmall';

    const bar = this.sortedEntities
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
    const { barHeight, barMargin } = this.profileConstants;
    this.barSvg.attr('height', `${(barHeight + barMargin) * this.sortedEntities.length}px`);
  }


  _scroll(duration = 0) {
    const follow = this.barContainer.select('.vzb-selected');
    if (!follow.empty()) {
      const d = follow.datum();
      const yPos = this._getBarPosition(d.index);

      const { margin } = this.profileConstants;
      const height = this.height - margin.top - margin.bottom;

      const scrollTo = yPos - (height + this.profileConstants.barHeight) / 2;
      this.barViewport.transition().duration(duration)
        .tween('scrollfor' + d.entity, this._scrollTopTween(scrollTo));
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

    this.barContainer.selectAll('.vzb-br-bar>rect')
      .each(function(d) {
        const rect = d3.select(this);

        const colorValue = d.color;
        const isColorValid = colorValue || colorValue === 0;

        const fillColor = isColorValid ? String(_this._getColor(colorValue)) : COLOR_WHITEISH;
        const strokeColor = isColorValid ? 'transparent' : COLOR_BLACKISH;

        rect.style('fill') !== fillColor && rect.style('fill', fillColor);
        rect.style('stroke') !== strokeColor && rect.style('stroke', strokeColor);
      });

    this.barContainer.selectAll('.vzb-br-bar>text')
      .style('fill', (d) => this._getDarkerColor(d.color || null));
  }

  _getColor(value) {
    return d3.rgb(this.cScale(value));
  }

  _getDarkerColor(d) {
    return this._getColor(d).darker(2);
  }

  _updateOpacity() {
    const _this = this;

    //JASPER: add params to select and highlight models or to this component ui model?

    const {
      opacityHighlightDim,
      opacitySelectDim,
      opacityRegular,
    } = this.state;

    const someHighlighted = this.highlightedFilter.markers.size > 0;
    const someSelected = this.selectedFilter.markers.size > 0;

    this.barContainer.selectAll('.vzb-br-bar')
      .style('opacity', d => {
        if (_this.highlightedFilter.has(d)) return opacityRegular;
        if (_this.selectedFilter.has(d)) return opacityRegular;

        if (someSelected) return opacitySelectDim;
        if (someHighlighted) return opacityHighlightDim;

        return opacityRegular;
      });
  }
}