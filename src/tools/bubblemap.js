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
      name: "time-slider"
      //model: this.model
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

    this.children[0].getValue = d => this.getValue("origin", d);
    this.children[1].getValue = d => this.getValue("asylum_residence", d);

    this.addReaction(this.selectSingle);
    this.addReaction(this.crossFilter);
    this.addReaction(this.syncFrameModels);

    this.crossFilteredData = [];   
  }


  syncFrameModels(){
    this.model.stores.markers.get("marker_origin").encoding.get("frame").config.value = 
    this.model.stores.markers.get("marker_destination").encoding.get("frame").config.value;
  }

  getValue(direction, d){
    let origin = this.model.stores.markers.get("marker_origin")
      .encoding.get("selected").data.filter.markers.keys().next().value;

    let destination = this.model.stores.markers.get("marker_destination")
      .encoding.get("selected").data.filter.markers.keys().next().value;

    // for the case when nothing is selected
    if((this.crossFilteredData|| []).length === 0) return d;
      
    // if the selection happened in only one pannel, then show it unchanged
    if (origin && !destination && direction === "origin") return d;
    if (!origin && destination && direction === "asylum_residence") return d;

    let find = this.crossFilteredData.find(f => d[direction] == f[direction] && f.time - d.time == 0 ) || {};

    return Object.assign({}, d, {size: find.size || null});
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
  
  crossFilter() {
    let origin = this.model.stores.markers.get("marker_origin")
      .encoding.get("selected").data.filter.markers.keys().next().value;

    let destination = this.model.stores.markers.get("marker_destination")
      .encoding.get("selected").data.filter.markers.keys().next().value;

    let data = this.model.stores.markers.get("marker_cross").dataArray;

    this.crossFilteredData = [];

    if(!origin && !destination) return;

    data.forEach(d => {
      if ((!origin || origin.replace("origin-","") === d.origin) 
      && (!destination || destination.replace("asylum_residence-","") === d.asylum_residence )) {
        this.crossFilteredData.push({
          origin: d.origin,
          asylum_residence: d.asylum_residence,
          time: d.time,
          size: d.size
        });
      }
    });

    this.children[0]._drawData();
    this.children[1]._drawData();
  }  
}



  // default_model: {
  //   state: {
  //     time: {
  //       "autoconfig": {
  //         "type": "time"
  //       }
  //     },
  //     entities: {
  //       "autoconfig": {
  //         "type": "entity_domain",
  //         "excludeIDs": ["tag"]
  //       }
  //     },
  //     entities_colorlegend: {
  //       "autoconfig": {
  //         "type": "entity_domain",
  //         "excludeIDs": ["tag"]
  //       }
  //     },
  //     marker: {
  //       limit: 5000,
  //       space: ["entities", "time"],
  //       hook_lat: {
  //         use: "property",
  //         "autoconfig": {
  //           index: 0,
  //           type: "measure"
  //         },
  //         _important: true
  //       },
  //       hook_lng: {
  //         use: "property",
  //         "autoconfig": {
  //           index: 1,
  //           type: "measure"
  //         },
  //         _important: true
  //       },import VizabiBubblemap from '../../../vizabi-bubblemap/src/component';

  //       label: {
  //         use: "property",
  //         "autoconfig": {
  //           "includeOnlyIDs": ["name"],
  //           "type": "string"
  //         }
  //       },
  //       size: {
  //         "autoconfig": {
  //             index: 2,
  //             type: "measure"
  //           }
  //       },
  //       color: {
  //         syncModels: ["marker_colorlegend"],
  //         "autoconfig": {}
  //       }
  //     },
  //     "marker_colorlegend": {
  //       "space": ["entities_colorlegend"],
  //       "label": {
  //         "use": "property",
  //         "which": "name"
  //       },
  //       "hook_rank": {
  //         "use": "property",
  //         "which": "rank"
  //       },
  //       "hook_geoshape": {
  //         "use": "property",
  //         "which": "shape_lores_svg"
  //       }
  //     }
  //   },



