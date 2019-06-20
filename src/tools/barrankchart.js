import TimeSlider from "../components/time-slider/time-slider.js";
import VizabiBarrankchart from "../components/vizabi-barrankchart.js";
import BaseComponent from "../components/base-component.js";
import LocaleService from "../services/locale.js";
import LayoutService from "../services/layout.js";
import { reaction, action } from "mobx";


export default class Barrankchart extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: VizabiBarrankchart,
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
      locale: new LocaleService(),
      layout: new LayoutService()
    };

    //register locale service in the marker model
    config.model.config.data.locale = config.services.locale;

    super(config);
  }
}
