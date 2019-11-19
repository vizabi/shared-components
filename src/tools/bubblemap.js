import TimeSlider from "../components/time-slider/time-slider.js";
import DataNotes from "../components/datanotes/datanotes.js";
import VizabiBubblemap from "../components/bubblemap/vizabi-bubblemap.js";
import BaseComponent from "../components/base-component.js";
import LocaleService from "../services/locale.js";
import LayoutService from "../services/layout.js";
import TreeMenu from "../components/treemenu/treemenu.js";
import { autorun } from 'mobx';


export default class BubbleMap extends BaseComponent {

  constructor(config){
    let marker_destination = config.model.stores.markers.get("marker_destination");
    let marker_origin = config.model.stores.markers.get("marker_origin");

    config.subcomponents = [{
      type: VizabiBubblemap,
      placeholder: ".vzb-chart-1",
      model: marker_origin,
      name: "chart"
    },{
      type: VizabiBubblemap,
      placeholder: ".vzb-chart-2",
      model: marker_destination
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      name: "time-slider",
      model: marker_destination
    // },{
    //   type: TreeMenu,
    //   placeholder: ".vzb-treemenu",
    //   name: "tree-menu"
    //   //model: this.model
    // },{
    //   type: DataNotes,
    //   placeholder: ".vzb-datanotes",
    //   //model: this.model
    // },{
    //   type: ButtonList,
    //   placeholder: ".vzb-buttonlist",
    //   name: "buttons"
    //   //model: this.model
    }];

    config.template = `
      <div class="vzb-bubblemap vzb-chart-1"></div>
      <div class="vzb-bubblemap vzb-chart-2"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu vzb-hidden"></div>
      <div class="vzb-datanotes vzb-hidden"></div>
    `;

    config.services = {
      locale: new LocaleService(),
      layout: new LayoutService(config)
    };

    //register locale service in the marker model
    marker_destination.config.data.locale = config.services.locale;
    marker_origin.config.data.locale = config.services.locale;

    super(config);

    this.concepts = {
      FRAME: marker_origin.config.encoding.frame.data.concept,
      KEY: marker_origin.config.data.space[0],
      ORIGIN: "origin",
      DESTINATION: "destination",
      ENCODING: "size"
    };

    this.children[0]._processFrameData = () => this._processFrameData(this.children[0], this.concepts.ORIGIN, this.concepts.ENCODING);
    this.children[1]._processFrameData = () => this._processFrameData(this.children[1], this.concepts.DESTINATION, this.concepts.ENCODING);

    this.addReaction(this.selectSingle);
    this.addReaction(this.filterOriginsByDestination);
    this.addReaction(this.filterDestinationsByOrigin);
    this.addReaction(this.syncFrameModels);

    this.crossFilteredData = [];   
  }

  syncFrameModels(){
    this.model.stores.markers.get("marker_origin").encoding.get("frame").config.value = 
      this.model.stores.markers.get("marker_destination").encoding.get("frame").config.value;
  }

  _processFrameData(_this, DIRECTION, ENCODING) {
       
    const rollup = d3.nest()
      .key(d => d[DIRECTION])
      .rollup(v => {
        const result = Object.assign({}, v[0]);
        result[Symbol.for("key")] = v[0][DIRECTION]
        result[ENCODING] = d3.sum(v, d => d[ENCODING]);
        return result;
      })
      .entries(_this.model.dataArray)
      .map(m => m.value)
      .sort((a, b) => b[ENCODING] - a[ENCODING]);
      
    return _this.__dataProcessed = rollup;
  }

  selectSingle(){
    //unselect all markers except the last one that was selected
    //couldn't find a better way to do that

    let marker_origin = this.model.stores.markers.get("marker_origin");
    let marker_destination = this.model.stores.markers.get("marker_destination");

    const origin_filter = marker_origin.encoding.get("selected").data.filter;
    const dest_filter = marker_destination.encoding.get("selected").data.filter;
    
    while(origin_filter.markers.size > 1) {
      for (let a of origin_filter.markers.keys()) {origin_filter.markers.delete(a); break;}
    }
    while(dest_filter.markers.size > 1) {
      for (let a of dest_filter.markers.keys()) {dest_filter.markers.delete(a); break;}
    }
  }

  filterOriginsByDestination(){
    let destination = this.model.stores.markers.get("marker_destination")
      .encoding.get("selected").data.filter.markers.keys().next().value;
      
    if (destination) this.model.stores.markers.get("marker_origin").data.filter.config.dimensions = 
      {destination: {destination: {"$in": [destination]}}};
  }


  filterDestinationsByOrigin(){
    let origin = this.model.stores.markers.get("marker_origin")
      .encoding.get("selected").data.filter.markers.keys().next().value;
      
    if (origin) this.model.stores.markers.get("marker_destination").data.filter.config.dimensions = 
      {origin: {origin: {"$in": [origin]}}};
  }
}
