import TimeSlider from "../components/time-slider/time-slider.js";
import VegaBarchart from "../components/vega-barchart.js";
import BaseComponent from "../components/base-component.js";
import TranslationService from "../services/translation.js";
import LayoutService from "../services/layout.js";

export default class BarChart extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: VegaBarchart,
      placeholder: ".vzb-chart",
      //model: this.model
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      //model: this.model
    }];
  
    config.template = `
      <div class="vzb-chart"></div>
      <div class="vzb-timeslider"></div>
    `;
  
    config.services = {
      translation: new TranslationService(),
      layout: new LayoutService()
    };

    super(config);
  }
}