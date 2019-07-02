import BaseComponent from "./base-component.js";
import {autorun} from "mobx";
import "./vizabi-barrankchart.scss";
import * as utils from "./legacy/base/utils";
import {STATUS} from "../utils";
// import axisWithLabelPicker from "./legacy/helpers/d3.axisWithLabelPicker";

const COLOR_BLACKISH = "rgb(51, 51, 51)";
const COLOR_WHITEISH = "rgb(253, 253, 253)";

const profiles = {
  small: {
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
  medium: {
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
  large: {
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

const presentationProfileChanges = {
  medium: {
    margin: {top: 60, right: 30, left: 10, bottom: 40},
    headerMargin: {top: 10, right: 20, bottom: 20, left: 20},
    infoElHeight: 25,
    infoElMargin: 10,
    barHeight: 25,
    barMargin: 6
  },
  large: {
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

  /*
    this.KEYS = this.model.data.space.filter(v => v != 'time');
    this.markerKeys = this.model.encoding.get('y').data.domain.map(v => ({[this.model.encoding.get('y').data.concept]: v}));
   */

  setup() {
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

    this.activeProfile = profiles.medium;// this.getActiveProfile(profiles, presentationProfileChanges);

    const {
      margin,
      headerMargin,
      infoElHeight,
      infoElMargin,
    } = this.activeProfile;

    this.barViewport
      .style('height', `${this.height - margin.bottom - margin.top}px`);
    this.nullValuesCount = 0;

    // ???
    // this.barContainer.classed("vzb-dimmed-selected", false);
    // this.barContainer.selectAll(".vzb-br-bar.vzb-selected").classed("vzb-selected", false);
    this.cScale = d3.scaleOrdinal(d3.schemeCategory10);
  }

  draw(data) {
    // TODO: refactor me!
    this.countryToRegion = {};
    for (const record of data) {
      this.countryToRegion[record.country] = record.color;
    }
    this.KEYS = this.model.data.space.filter(v => v != "time");
    this.KEY = this.KEYS.join(",");

    this.markerKeys = this.model.encoding.get("y").data.domain.map(v => ({[this.model.encoding.get("y").data.concept]: v}));
    this.dataKeys = {
      axis_x: [this.model.encoding.get("y").data.concept],
      label: [this.model.encoding.get("y").data.concept],
      color: [this.model.encoding.get("y").data.concept],
      axis_y: [this.model.encoding.get("y").data.concept]
    };
    const xAxisValues = {};
    for (const record of data) {
      xAxisValues[record.y] = record.x;
    }
    this.sortedEntities = this._sortByIndicator(xAxisValues, this.dataKeys.axis_x);

    this.drawProc(true);
    // this._updateOpacity();
    this._drawColors();
  }

  resize() {
    // const width = this.services.layout.layoutModel.width;
    // const height = this.services.layout.layoutModel.height;
    // if(this.chart) this.chart.width(width).run();
    if(this.status === STATUS.READY){
      this.drawProc(true);
      // this._updateOpacity();
      this._drawColors();

    }
  }

  loading() {
    // this.view.classed("loading", true);
  }

  _sortByIndicator(values, dataKey) {
    const KEYS = this.KEYS;

    return this.markerKeys.map(entity => {
      const key = utils.getKey(entity, KEYS);
      const cached = this._entities[key];

      const value = values[utils.getKey(entity, dataKey)];
      !value && value !== 0 && this.nullValuesCount++;
      // const label = this._getLabelText(this.values, this.labelNames, entity);
      // const formattedValue = this._formatter(value);
      const label = key;
      const formattedValue = `${value}`;

      this._entities[key] = {
        entity,
        value,
        label,
        formattedValue,
        [this.KEY]: key,
        changedValue: true,
        changedWidth: true,
        isNew: true
      };

      if (cached) {
        return Object.assign(cached, {
          value,
          label,
          formattedValue,
          changedValue: formattedValue !== cached.formattedValue,
          changedWidth: value !== cached.value,
          isNew: false
        });
      }

      return this._entities[key];
    }).sort(({value: a}, {value: b}) => (b || (b === 0 ? 0 : -Infinity)) - (a || (a === 0 ? 0 : -Infinity)))
      .map((entity, index, entities) =>
        Object.assign(entity, {
          index: index,
          rank: !index || entities[index - 1].formattedValue !== entity.formattedValue ? index + 1 : entities[index - 1].rank,
          changedIndex: index !== entity.index
        }));
  }

  _createAndDeleteBars(_updatedBars) {
    // const _this = this;
    const KEYS = this.KEYS;
    // const dataKeys = this.dataKeys;

    const [entity] = this.sortedEntities;
    /*if (!this._entityLabels[entity.entity]) {
      this._entityLabels[entity.entity] = entity.label;
    }

    const label = this._getLabelText(this.values, this.labelNames, entity.entity)
    const localeChanged = this._entityLabels[entity.entity] !== label
      && this.model.locale.id !== this._localeId;

    if (localeChanged) {
      this._localeId = this.model.locale.id;
      this._entityLabels[entity.entity] = label;
    }*/

    const localeChanged = false;

    // make the groups for the entities which were not drawn yet (.data.enter() does this)

    const updatedBars = !this.isFirstUsage ? _updatedBars.enter().append("g") : _updatedBars;

    // remove groups for entities that are gone
    updatedBars.exit().remove();

    const newUpdatedBars = updatedBars.each(function (d) {
        const self = d3.select(this);
        const label = d.label;
        const labelSmall = label.length < 12 ? label : `${label.substring(0, 9)}...`;//…

        const selectedLabel = self.select(".vzb-br-label");
        const barLabel = selectedLabel.size() ?
          selectedLabel :
          self.append("text")
            .attr("class", "vzb-br-label")
            .attr("dy", ".325em");

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
            .attr("class", "vzb-br-bar")
            // .classed('vzb-selected', _this.model.marker.isSelected(d.entity))
            .attr("id", `vzb-br-bar-${utils.getKey(d.entity, KEYS)}`)
            // .on('mousemove', d => _this.model.marker.highlightMarker(d.entity))
            // .on('mouseout', () => _this.model.marker.clearHighlighted())
            .on("click", d => {
              // _this.model.marker.selectMarker(d.entity);
            });

          const barRect = self.append("rect")
            .attr("stroke", "transparent");

          const barValue = self.append("text")
            .attr("class", "vzb-br-value")
            .attr("dy", ".325em");

          const barRank = self.append("text")
            .attr("class", "vzb-br-rank")
            .attr("dy", ".325em");

          Object.assign(d, {
            self,
            isNew: true,
            barRect,
            barValue,
            barRank
          });
        }
      });

    updatedBars.merge(newUpdatedBars);
    this.isFirstUsage = true;
  }

  drawProc(force = false) {
    this.time_1 = this.time == null ? this.model.encoding.get('frame').value : this.time;
    this.time = this.model.encoding.get('frame').value;
    // const duration = this.model.time.playing && (this.time - this.time_1 > 0) ? this.model.time.delayAnimations : 0;
    this._updateForecastOverlay();
    const duration = 0;
    // if (this.drawAxes(duration, force)) return;
    this.drawAxes(duration, force);
    // this.drawData(duration, force);
    this.drawData(duration, true);
  }

  drawAxes(duration = 0) {
    // this.height = parseInt(this.element.style('height'), 10) || 0;
    // this.width = parseInt(this.element.style('width'), 10) || 0;

    this.width = this.services.layout.layoutModel.width;
    this.height = 400; // this.services.layout.layoutModel.height;

    const {
      margin,
      headerMargin,
      infoElHeight,
      infoElMargin,
    } = this.activeProfile;

    if (!this.height || !this.width) return utils.warn("Dialog resize() abort: vizabi container is too little or has display:none");

    this.barViewport
      .style("height", `${this.height - margin.bottom - margin.top}px`);

    // header
    this.header.attr('height', margin.top);
    const headerTitle = this.header.select('.vzb-br-title');

    // change header titles for new data
    // const { name, unit } = this.model.marker.axis_x.getConceptprops();

    const name = "Population, total";
    const unit = "";

    const headerTitleText = headerTitle
      .select('text');

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
      .attr('transform', `translate(${titleTx}, ${titleTy})`);

    const headerInfo = this.infoEl;

    headerInfo.select('svg')
      .attr('width', `${infoElHeight}px`)
      .attr('height', `${infoElHeight}px`);

    const infoTx = titleTx + headerTitle.node().getBBox().width + infoElMargin;
    const infoTy = headerMargin.top + infoElHeight / 4;
    headerInfo.attr('transform', `translate(${infoTx}, ${infoTy})`);


    const headerTotal = this.header.select('.vzb-br-total');

    if (duration) {
      headerTotal.select('text')
        .transition('text')
        .delay(duration)
        // .text(this.model.time.formatDate(this.time));
        .text(`${this.time}`);
    } else {
      headerTotal.select('text')
        .interrupt()
        // .text(this.model.time.formatDate(this.time));
        .text(`${this.time}`);
    }
    // headerTotal.style('opacity', Number(this.getLayoutProfile() !== 'large'));

    const headerTotalBBox = headerTotal.node().getBBox();

    const totalTx = this.width - headerMargin.right - headerTotalBBox.width;
    const totalTy = headerMargin.top + headerTotalBBox.height;
    headerTotal
      .attr('transform', `translate(${totalTx}, ${totalTy})`)
      .classed('vzb-transparent', headerTitleBBox.width + headerTotalBBox.width + 10 > this.width);

    this.element.select('.vzb-data-warning-svg')
      .style('height', `${margin.bottom}px`);


    const warningBBox = this.dataWarningEl.select('text').node().getBBox();
    this.dataWarningEl
      .attr('transform', `translate(${this.width - margin.right - warningBBox.width}, ${warningBBox.height})`);

    this.dataWarningEl
      .select('svg')
      .attr('width', warningBBox.height)
      .attr('height', warningBBox.height)
      .attr('x', -warningBBox.height - 5)
      .attr('y', -warningBBox.height + 1);

    this.missedPositionsWarningEl
      .attr('transform', `translate(${this.width - margin.right - warningBBox.width - warningBBox.height * 3}, ${warningBBox.height})`);

    // this._updateDoubtOpacity();
  }

  drawData(duration = 0, force = false) {
    const KEY = this.KEY;
    // update the shown bars for new data-set

    this._createAndDeleteBars(
      this.barContainer.selectAll(".vzb-br-bar")
        .data(this.sortedEntities, d => d[KEY])
    );


    /*const { presentation } = this.model.ui;
    const presentationModeChanged = this._presentation !== presentation;

    if (presentationModeChanged) {
      this._presentation = presentation;
    }


    const entitiesCountChanged = typeof this._entitiesCount === 'undefined'
      || this._entitiesCount !== this.sortedEntities.length;

    if (presentationModeChanged || entitiesCountChanged) {
      if (entitiesCountChanged) {
        this._entitiesCount = this.sortedEntities.length;
      }
    }*/

    const presentationModeChanged = false;

    this._resizeSvg();
    this._scroll();
    this._drawColors();


    const {barLabelMargin, barValueMargin, barRankMargin, scrollMargin, margin} = this.activeProfile;

    /*const { axis_x } = this.model.marker;
    const limits = axis_x.getLimits(axis_x.which);
    const ltr = Math.abs(limits.max) >= Math.abs(limits.min);
    const hasNegativeValues = ltr ? limits.min < 0 : limits.max > 0;*/

    const hasNegativeValues = false;
    const ltr = false;

    const rightEdge = (
      this.width
      - margin.right
      - margin.left
      - barLabelMargin
      - scrollMargin
      - (hasNegativeValues ? 0 : this._getWidestLabelWidth())
    ) / (hasNegativeValues ? 2 : 1);

    this.xScale = this.model.encoding.get("x").scale;

    this.xScale.range = [0, rightEdge];

    /*if (this.model.marker.axis_x.scaleType !== "log") {
      this.xScale
        .domain([0, Math.max(...this.xScale.domain())]);
    }*/

    const shift = hasNegativeValues ? rightEdge : this._getWidestLabelWidth();

    const xAxis = d3.axisBottom();
    const barWidth = (value) => xAxis.scale(value); // this.xScale(value);
    const isLtrValue = value => ltr ? value >= 0 : value > 0;

    const labelAnchor = value => isLtrValue(value) ? "end" : "start";
    const valueAnchor = value => isLtrValue(value) ? "start" : "end";

    const labelX = value => isLtrValue(value) ? -barLabelMargin : barLabelMargin;

    const valueX = value => isLtrValue(value) ? barValueMargin : -barValueMargin;

    const isLabelBig = (this._getWidestLabelWidth(true) + (ltr ? margin.left : margin.right)) < shift;

    this.barContainer.attr("transform", `translate(${shift + (ltr ? margin.left : margin.right) + barLabelMargin}, 0)`);

    this.sortedEntities.forEach((bar) => {
      const {value} = bar;

      if (force || presentationModeChanged || bar.isNew || bar.changedValue) {
        bar.barLabel
          .attr("x", labelX(value))
          .attr("y", this.activeProfile.barHeight / 2)
          .attr("text-anchor", labelAnchor(value))
          .text(isLabelBig ? bar.label : bar.labelSmall);

        bar.barRect
          .attr("rx", this.activeProfile.barHeight / 4)
          .attr("ry", this.activeProfile.barHeight / 4)
          .attr("height", this.activeProfile.barHeight);

        bar.barValue
          .attr("x", valueX(value))
          .attr("y", this.activeProfile.barHeight / 2)
          .attr("text-anchor", valueAnchor(value));

        bar.barRank
          .text((d, i) => value || value === 0 ? "#" + d.rank : "")
          .attr("y", this.activeProfile.barHeight / 2);
      }

      if (force || bar.changedWidth || presentationModeChanged) {
        // TODO: barWidth is an issue!
        // const width = Math.max(0, value && barWidth(Math.abs(value))) || 0;
        const width = value / 950000;

        if (force || bar.changedValue) {
          /*bar.barValue
            .text(this._formatter(value) || this.translator("hints/nodata"));*/
          bar.barValue.text(`${value}`);
          bar.barValueWidth = barValueMargin + bar.barValue.node().getBBox().width;
        }

        if (force || bar.changedWidth || presentationModeChanged) {
          bar.barRect
            .transition().duration(duration).ease(d3.easeLinear)
            .attr("width", width);
          bar.barRank
            .transition().duration(duration).ease(d3.easeLinear)
            .attr("x", (Math.max(width, bar.barValueWidth) + barRankMargin) * (isLtrValue(value) ? 1 : -1))
            .attr("text-anchor", valueAnchor(value));
        }

        bar.barRect
          .attr("x", value < 0 ? -width : 0);
      }

      if (force || bar.changedIndex || presentationModeChanged) {
        !duration && bar.self.interrupt();
        (duration ? bar.self.transition().duration(duration).ease(d3.easeLinear) : bar.self)
          .attr("transform", `translate(0, ${this._getBarPosition(bar.index)})`);
        bar.barRank
          .text((d, i) => value || value === 0 ? "#" + (d.rank) : "");
      }
    });
  }

  _resizeSvg() {
    const {barHeight, barMargin} = this.activeProfile;
    this.barSvg.attr("height", `${(barHeight + barMargin) * this.sortedEntities.length}px`);
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

  _drawColors() {
    const _this = this;
    const dataKeys = this.dataKeys;

    this.barContainer.selectAll(".vzb-br-bar>rect")
      .each(function ({entity}) {
        const rect = d3.select(this);

        const colorValue = _this.countryToRegion[utils.getKey(entity, dataKeys.color)];
        const isColorValid = colorValue || colorValue === 0;

        const fillColor = isColorValid ? String(_this._getColor(colorValue)) : COLOR_WHITEISH;
        const strokeColor = isColorValid ? "transparent" : COLOR_BLACKISH;

        rect.style("fill") !== fillColor && rect.style("fill", fillColor);
        rect.style("stroke") !== strokeColor && rect.style("stroke", strokeColor);
      });

    this.barContainer.selectAll('.vzb-br-bar>text')
      .style('fill', ({ entity }) => this._getDarkerColor(_this.countryToRegion[utils.getKey(entity, dataKeys.color)] || null));
  }

  _getColor(value) {
    return d3.rgb(this.cScale(value));
  }

  _getDarkerColor(d) {
    return this._getColor(d).darker(2);
  }

  _updateForecastOverlay() {
    this.forecastOverlay.classed("vzb-hidden", false);
  }

  _getBarPosition(i) {
    return (this.activeProfile.barHeight + this.activeProfile.barMargin) * i;
  }

  _scroll(duration = 0) {
    const follow = this.barContainer.select('.vzb-selected');
    if (!follow.empty()) {
      const d = follow.datum();
      const yPos = this._getBarPosition(d.index);

      const { margin } = this.activeProfile;
      const height = this.height - margin.top - margin.bottom;

      const scrollTo = yPos - (height + this.activeProfile.barHeight) / 2;
      this.barViewport.transition().duration(duration)
        .tween('scrollfor' + d.entity, this._scrollTopTween(scrollTo));
    }
  }
}
