import BaseComponent from "./base-component.js";
//import { changeset } from 'vega/build/vega-module.js';
import { autorun } from "mobx";

export default class VizabiBarrankchart extends BaseComponent {

  constructor(config){
    config.template = `
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
`;
    super(config);
  }
  setup() {
    this.chart = d3.select(this.chart);
    this.header = this.chart.select('.vzb-br-header');
    this.infoEl = this.chart.select('.vzb-br-axis-info');
    this.barViewport = this.chart.select('.vzb-br-barsviewport');
    this.barSvg = this.chart.select('.vzb-br-bars-svg');
    this.barContainer = this.chart.select('.vzb-br-bars');
    // this.dataWarningEl = this.chart.select('.vzb-data-warning');
    this.tooltipSvg = this.chart.select(".vzb-br-tooltip-svg");
    this.tooltip = this.chart.select(".vzb-br-tooltip");
    this.forecastOverlay = this.chart.select(".vzb-br-forecastoverlay");
    this.missedPositionsWarningEl = this.chart.select('.vzb-data-warning-missed-positions');
    const _interact = this._createTooltipInteract(this.chart, this.missedPositionsWarningEl);
    this.missedPositionsWarningEl
      .on("mouseover", _interact.mouseOver)
      .on("mouseout", _interact.mouseOut);
    this.wScale = d3.scaleLinear()
      // .domain(this.model.ui.datawarning.doubtDomain)
      // .range(this.model.ui.datawarning.doubtRange);

    // set up formatters
    // this.xAxis.tickFormat(this.model.marker.axis_x.getTickFormatter());

    // this._localeId = this.model.locale.id;
    this._entityLabels = {};
    // this._presentation = !this.model.ui.presentation;
    // this._formatter = this.model.marker.axis_x.getTickFormatter();

    this.ready();

    this._selectBars();

  }

  draw(data) {
    this.view.classed("loading", false);
    data.forEach(d => d.x = d[Symbol.for("key")]);
    // Changeset needs to remove everything first, then insert new data
    let chg = vega.changeset().remove(() => true).insert(data);
    // For some reason source_0 is the default dataset name
    this.chart.change("table", chg).run();
  }

  resize() {
    const width = this.services.layout.layoutModel.width;
    // if(this.chart) this.chart.width(width).run();
  }

  loading() {
    this.view.classed("loading", true);
  }

  ready() {
    // this.TIMEDIM = this.model.time.getDimension();
    /* this.KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    this.KEY = this.KEYS.join(",");
    this.dataKeys = this.model.marker.getDataKeysPerHook();
    this.labelNames = this.model.marker.getLabelHookNames();

    this.model.marker.getFrame(this.model.time.value, values => {
      this.values = values;

      if (this.values) {
        this.markerKeys = this.model.marker.getKeys();
        if (this.loadData()) {
          this.draw(true);
          this._updateOpacity();
          this._drawColors();
        }
      }
    });*/
  }

  _createTooltipInteract(contextElement, sourceElement) {
    const _this = this;
    return {
      mouseOver() {
        const evt = d3.event;
        const mouse = d3.mouse(contextElement.node());
        const sourceElementBBox = sourceElement.node().getBBox();
        const coordInSource= d3.mouse(sourceElement.node());
        _this.tooltipSvg.classed("vzb-hidden", false);
        _this._setTooltip(d3.select(evt.target).attr("data-text"),
          mouse[0] - coordInSource[0],
          mouse[1] - coordInSource[1] + sourceElementBBox.y);
      },
      mouseOut() {
        _this.tooltipSvg.classed("vzb-hidden", true);
        _this._setTooltip();
      },
      tap() {

      }
    };
  }

  _selectBars() {
    //const KEYS = this.KEYS;
    // const selected = this.model.marker.select;

    // unselect all bars
    this.barContainer.classed('vzb-dimmed-selected', false);
    this.barContainer.selectAll('.vzb-br-bar.vzb-selected').classed('vzb-selected', false);

    // select the selected ones
    /*if (selected.length) {
      this.barContainer.classed('vzb-dimmed-selected', true);
      selected.forEach(selectedBar => {
        this.barContainer
          .select(`#vzb-br-bar-${cssEscape(utils.getKey(selectedBar, KEYS))}-${this._id}`)
          .classed('vzb-selected', true);
      });
    }*/
  }
}
