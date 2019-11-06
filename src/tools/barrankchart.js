import TimeSlider from "../components/time-slider/time-slider.js";
import DataNotes from "../components/datanotes/datanotes.js";
import VizabiBarrankchart from "../components/vizabi-barrankchart.js";
import BaseComponent from "../components/base-component.js";
import LocaleService from "../services/locale.js";
import LayoutService from "../services/layout.js";
import TreeMenu from "../components/treemenu/treemenu.js";

export default class Barrankchart extends BaseComponent {

  constructor(config){
    let marker_destination = config.model.stores.markers.get("marker_destination");
    let marker_origin = config.model.stores.markers.get("marker_origin");

    config.subcomponents = [{
      type: VizabiBarrankchart,
      placeholder: ".vzb-chart-1",
      model: marker_destination
    },{
      type: VizabiBarrankchart,
      placeholder: ".vzb-chart-2",
      model: marker_origin
    // },{
    //   type: TimeSlider,
    //   placeholder: ".vzb-timeslider",
    //   model: marker_destination
    // },{
    //   type: TreeMenu,
    //   placeholder: ".vzb-treemenu",
    //   //model: this.model
    // },{
    //   type: DataNotes,
    //   placeholder: ".vzb-datanotes",
    //   //model: this.model
    }];

    config.template = `
      <div class="vzb-barrankchart vzb-chart-1"></div>
      <div class="vzb-barrankchart vzb-chart-2"></div>
      <div class="vzb-timeslider"></div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datanotes"></div>
    `;

    config.services = {
      locale: new LocaleService(),
      layout: new LayoutService(config)
    };

    //register locale service in the marker model
    marker_destination.config.data.locale = config.services.locale;
    marker_origin.config.data.locale = config.services.locale;

    super(config);
  }
}
