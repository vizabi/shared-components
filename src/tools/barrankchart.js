import TimeSlider from "../components/time-slider/time-slider.js";
import DataNotes from "../components/datanotes/datanotes.js";
import VizabiBarrankchart from "../components/vizabi-barrankchart.js";
import BaseComponent from "../components/base-component.js";
import LocaleService from "../services/locale.js";
import LayoutService from "../services/layout.js";
import TreeMenu from "../components/treemenu/treemenu.js";
import SteppedSlider from "../components/stepped-slider/stepped-slider.js";

export default class Barrankchart extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: VizabiBarrankchart,
      placeholder: ".vzb-barrankchart",
      //model: this.model
      name: "chart"
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      name: "time-slider"
      //model: this.model
    },{
      type: SteppedSlider,
      placeholder: ".vzb-speedslider",
      name: "speed-slider"
      //model: this.model
    },{
      type: TreeMenu,
      placeholder: ".vzb-treemenu",
      name: "tree-menu"
      //model: this.model
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      //model: this.model
    }];

    config.template = `
      <div class="vzb-barrankchart"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datanotes"></div>
      <div class="vzb-buttonlist"></div>
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
