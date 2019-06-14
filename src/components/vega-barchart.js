import BaseComponent from "./base-component.js";
//import { changeset } from 'vega/build/vega-module.js';
import { autorun } from "mobx";

export default class VegaBarchart extends BaseComponent {

  constructor(config){
    config.template = `<div class="vzb-bc"></div>`;
    super(config);
  }
  setup() {
    const spec = {
      "$schema": "https://vega.github.io/schema/vega/v4.0.json",
      "width": this.services.layout.layoutModel.width,
      "height": 400,
      "autosize": {"type":"fit","resize":"true"},
      "padding": 0,
          
      "data": [
        {
          "name": "table",
          "values": []
        }
      ],
          
      "signals": [
        {
          "name": "tooltip",
          "value": {},
          "on": [
            {"events": "rect:mouseover", "update": "datum"},
            {"events": "rect:mouseout",  "update": "{}"}
          ]
        }
      ],
          
      "scales": [
        {
          "name": "cscale",
          "domain": {"data": "table", "field": "color"},
          "range": {"scheme": "magma"}
        },
        {
          "name": "xscale",
          "type": "band",
          "domain": {"data": "table", "field": "x"},
          "range": "width"
        },
        {
          "name": "yscale",
          "domain": {"data": "table", "field": "y"},
          "nice": true,
          "range": "height"
        }
      ],
          
      "axes": [
        { "orient": "bottom", "scale": "xscale" },
        { "orient": "left", "scale": "yscale" }
      ],
          
      "marks": [
        {
          "type": "rect",
          "from": {"data":"table"},
          "encode": {
            "enter": {
              "x": {"scale": "xscale", "field": "x", "offset": 0},
              "width": {"scale": "xscale", "band": 1, "offset": 0},
              "y": {"scale": "yscale", "field": "y"},
              "y2": {"scale": "yscale", "value": 0}
            },
            "update": {
              "fill": {"signal": "datum.color ? scale('cscale', datum.color) : '#FF33AA' "}
            },
            "hover": {
              "fill": {"value": "red"}
            }
          }
        },
        {
          "type": "text",
          "encode": {
            "enter": {
              "align": {"value": "center"},
              "baseline": {"value": "bottom"},
              "fill": {"value": "#333"}
            },
            "update": {
              "x": {"scale": "xscale", "signal": "tooltip.x", "band": 0.5},
              "y": {"scale": "yscale", "signal": "tooltip.y", "offset": -2},
              "text": {"signal": "tooltip.y"},
              "fillOpacity": [
                {"test": "datum === tooltip", "value": 0},
                {"value": 1}
              ]
            }
          }
        }
      ]
    };
          
    this.chart = null;

    vegaEmbed(".vzb-bc", spec)
    // result.view provides access to the Vega View API
      .then(result => this.chart = result.view)
      .catch(console.warn);
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
    if(this.chart) this.chart.width(width).run();
  }

  loading() {
    this.view.classed("loading", true);
  }
}  