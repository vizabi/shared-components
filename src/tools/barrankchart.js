import TimeSlider from "../components/time-slider/time-slider.js";
import DataNotes from "../components/datanotes/datanotes.js";
import VizabiBarrankchart from "../components/vizabi-barrankchart.js";
import BaseComponent from "../components/base-component.js";
import LocaleService from "../services/locale.js";
import LayoutService from "../services/layout.js";

export default class Barrankchart extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: VizabiBarrankchart,
      placeholder: ".vzb-barrankchart",
      //model: this.model
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      //model: this.model
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      //model: this.model
    }];

    config.template = `
      <div class="vzb-barrankchart" style="grid-row-start: 1; grid-column-start: 1;"></div>
      <div class="vzb-timeslider" style="grid-row-start: 2; grid-column-start: 1;"></div>
      <div class="vzb-datanotes vzb-hidden" style="grid-row-start: 1; grid-column-start: 1;"></div>
    `;

    config.services = {
      locale: new LocaleService(),
      layout: new LayoutService(config)
    };

    //register locale service in the marker model
    config.model.config.data.locale = config.services.locale;

    super(config);
  }
}
