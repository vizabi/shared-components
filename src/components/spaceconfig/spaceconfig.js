import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import {decorate, observable, computed, runInAction} from "mobx";
import "./spaceconfig.scss";
import * as d3 from "d3";

import { ICON_ELLIPSIS_V, ICON_CLOSE } from "../../icons/iconset.js";

function spacesAreEqual(a, b){
  return a.concat().sort().join() === b.concat().sort().join();
}

function getMatchingSpace(spaces, targetSpace){
  return spaces.find(s => spacesAreEqual(s, targetSpace));
}

function getSubspaces(spaces, targetSpace){
  return spaces.filter(s => s.every(dim => targetSpace.includes(dim)))
    //sort longest first
    .sort((a,b) => b.length - a.length);
}

function getSuperspaces(spaces, targetSpace){
  return spaces.filter(s => targetSpace.every(dim => s.includes(dim)))
    //sort shortest first
    .sort((a,b) => a.length - b.length);
}

function getPartiallyOverlappingSpaces(spaces, targetSpace){
  return spaces.filter(s => targetSpace.some(dim => s.includes(dim)))
    //sort shortest first
    .sort((a,b) => a.length - b.length);
}

function removeDulicates(array){
  const result = [];
  array.forEach(space => {
    if(!result.some(s => spacesAreEqual(s, space)))
      result.push(space);
  });
  return result;
}

let hidden = true;
class _SpaceConfig extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-spaceconfig-background"></div>
      <div class="vzb-spaceconfig-box">
        <div class="vzb-spaceconfig-title"></div>
        <div class="vzb-spaceconfig-body vzb-dialog-scrollable">
          <div class="vzb-spaceconfig-marker">
            <label for="vzb-spaceconfig-select"></label>
            <select id="vzb-spaceconfig-select"></select>
          </div>
          <div class="vzb-spaceconfig-encodings"></div>
        </div>
        <div class="vzb-spaceconfig-buttons">
        <div class="vzb-spaceconfig-button-apply"></div>
        <div class="vzb-spaceconfig-button-cancel"></div>
        </div>
      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {
      background: this.element.select(".vzb-spaceconfig-background"),
      container: this.element.select(".vzb-spaceconfig-box"),
      close: this.element.select(".vzb-spaceconfig-close"),
      title: this.element.select(".vzb-spaceconfig-title"),
      body: this.element.select(".vzb-spaceconfig-body"),
      marker: this.element.select(".vzb-spaceconfig-marker"),
      encodings: this.element.select(".vzb-spaceconfig-encodings"),
      buttoncancel: this.element.select(".vzb-spaceconfig-button-cancel"),
      buttonapply: this.element.select(".vzb-spaceconfig-button-apply"),
      button: d3.select(this.options.button)
    };
    
    this.element.classed("vzb-hidden", true);

    this.setupDialog();
    this.setupTiggerButton();
  }

  setupDialog() {
    this.DOM.background
      .on("click", () => {
        this.toggle(true);
      });

    this.DOM.container.append("div")
      .html(ICON_CLOSE)
      .on("click", () => {
        this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", "vzb-spaceconfig-close");

  }

  setupTiggerButton() {
    if(!this.DOM.button.size()) return utils.warn("quit setupTiggerButton of SpaceConfig because no button provided");
    
    utils.setIcon(this.DOM.button, ICON_ELLIPSIS_V)
      .attr("title", "Configure marker space")
      .on("click", () => {
        this.toggle();
      });
  }

  get MDL(){
    return {
      frame: this.model.encoding.frame
    };
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.updateUIstrings);
    this.addReaction(this.drawContent);

  }

  drawContent(){
    if (this.element.classed("vzb-hidden")) return;

    this.addReaction(this.updateMarker);
    this.addReaction(this.updateEncodigns);
    this.addReaction(this.updateApplyCancelButtons);
  }

  updateUIstrings(){
    this.DOM.title.html(this.localise("Space config"));
    this.DOM.marker.select("label").text(this.localise("Marker space"));
    this.DOM.buttoncancel.text("Cancel");
    this.DOM.buttonapply.text("Apply");
    //this.DOM.body.html(this.localise("datawarning/body/" + this.root.name));
  }

  toggle(arg) {
    if (arg == null) arg = !hidden;
    hidden = arg;
    this.element.classed("vzb-hidden", hidden);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", c != this && !hidden);
    });

    this.drawContent();
  }

  _getDataModels(dsConfig) {
    return Object.keys(dsConfig).map(dsName => this.services.Vizabi.Vizabi.stores.dataSources.get(dsName));
  }

  _getAvailability(){
    const items = [];
    this._getDataModels(this.root.model.config.dataSources).forEach(ds => {
      ds.availability.data.forEach(kv => {
        items.push({ key: kv.key, value: ds.getConcept(kv.value), source: ds });
      });
    });
    return items;
  }

  _getSpaceAvailability(){
    const items = [];
    this._getDataModels(this.root.model.config.dataSources).forEach(ds => {
      ds.availability.keyLookup.forEach(val => {
        items.push(val);
      });
    });
    return items;
  }

  _nestAvailabilityByConcepts(availability){
    return availability.reduce((map, kv) => {
      const key = kv.value;
      const space = kv.key;
      if (!map.has(key)) map.set(key, {source: kv.source, spaces: new Set()});
      map.get(key).spaces.add(space);
      return map;
    }, new Map());
  }

  //returns concepts and their spaces (availbility keys), 
  //such that only strict superspaces, strict subspaces and matching spaces remain
  _conceptsCompatibleWithMarkerSpace(availabilityMapByConcepts, markerSpace){
    const filteredValueLookup = new Map();
    const markerSpaceSet = new Set(markerSpace);
    const intersect = (a,b) => a.filter(e => b.has(e));
    for (const [concept, {source, spaces}] of availabilityMapByConcepts) {  
      const filteredSpaces = [...spaces].filter(space => {
        const intersection = intersect(space, markerSpaceSet);
        return intersection.length == markerSpaceSet.size || intersection.length == space.length;
      });
      if (filteredSpaces.length) filteredValueLookup.set(concept, {source, spaces: filteredSpaces});
    }
    return filteredValueLookup;
  }

  _convertConceptMapToArray(conceptmap){
    return [...conceptmap].map(([concept, {source, spaces}]) => ({concept, source, spaces: [...spaces]}));
  }


  updateMarker(){
    const _this = this;

    const frameConcept = this.MDL.frame.data.concept;
    const spaceAvailability = removeDulicates(this._getSpaceAvailability().filter(f => f.includes(frameConcept)));
    const selector = this.DOM.marker.select("select");
    const options = selector.selectAll("option").data(spaceAvailability, d => d.sort().join());
    options.exit().remove();
    options.enter().append("option")
      .text(d => d.join())
      .merge(options)
      .property("selected", d => spacesAreEqual(d, this.model.data.space));

    selector
      .on("change", function() {
        const space = d3.select(this.options[this.selectedIndex]).datum();
        _this.proposedSpace = space;
        _this.updateEncodigns();
        _this.updateApplyCancelButtons();
        //_this.model.config.data.space = space;
      });

  }

  getEncodings(){
    const encs = this.model.encoding;
    return Object.keys(encs).filter(enc => {
      if (!this.model.requiredEncodings || this.model.requiredEncodings.includes(enc)) return true;
      if (enc == "color") return true;
      if (enc == "label") return true;
    });
  }

  updateEncodigns(){
    const _this = this;
    const encs = this.model.encoding;

    const nest = this._nestAvailabilityByConcepts(this._getAvailability());
    //const filtervl = this._conceptsCompatibleWithMarkerSpace(nest, this.model.data.space);
    this.concepts = this._convertConceptMapToArray(nest);
    console.log(this.concepts);
    this.encNewConfig = {};

    this.DOM.encodings
      .html("")
      .selectAll("div")
      .data(this.getEncodings(), d=>d)
      .enter().append("div")
      .each(function(enc){
        const view = d3.select(this);

        const encoding = encs[enc];
        const status = _this.getSpaceCompatibilityStatus(encoding);
        const concept = _this.concepts.find(f => f.concept.concept == encoding.data.concept);
        const isSpaceSet = encoding.data.config.space;
        const newConfig = _this.encNewConfig[enc] = {};

        view.append("div")
          .attr("class", "vzb-spaceconfig-enc-status")
          .attr("title", status.status)
          .text(_this.statusIcons(status));

        view.append("div")
          .attr("class", "vzb-spaceconfig-enc-name")
          .text(enc);

        if(status.status == "constant"){
          view.append("div")
            .attr("class", "vzb-spaceconfig-enc-concept")
            .text("constant: " + encoding.data.constant);
        }else{

          view.append("div")
            .attr("class", "vzb-spaceconfig-enc-concept")
            .text(concept.concept.name);

          view.append("div")
            .attr("for", "vzb-spaceconfig-enc-space-current")
            .text("current space: " + encoding.data.space.join() + (isSpaceSet? " (set)" : " (inherited)") );

          if(status.status == "alreadyInSpace" || status.status == "entityPropertyDataConfig") {
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("new space: will reset to marker space if set");

            if(isSpaceSet) newConfig["space"] = null;
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }

          if(status.status == "matchingSpaceAvailable") {
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("new space: " + status.spaces[0].join() + (isSpaceSet? " (set)" : " (inherited)"));

            if(isSpaceSet) newConfig["space"] = null;
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }     
          
          if(status.status == "subspaceAvailable") {
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("new space: " + status.spaces[0].join() + " (set)");

            newConfig["space"] = status.spaces[0];
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }  

          if(status.status == "superspaceAvailable") {
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("new space: " + status.spaces[0].join() + " (set)");
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("suggest constants for compliment dimensions!");

            newConfig["space"] = status.spaces[0];
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }  


          if(status.status == "patialOverlap" || status.status == "noOverlap") {
            view.append("div")
              .attr("for", "vzb-spaceconfig-enc-space-new")
              .text("new space: not avaiable");

            view.append("label")
              .attr("for", "vzb-spaceconfig-enc-space-select")
              .text("select concept:");

            const filtervl = _this._conceptsCompatibleWithMarkerSpace(nest, _this.proposedSpace);
            const concepts = _this._convertConceptMapToArray(filtervl);
  
            const select = view.append("select")
              .attr("class", "vzb-spaceconfig-enc-concept-new")
              .attr("id", "vzb-spaceconfig-enc-space-select")
              .on("change", function(){
                newConfig["concept"] = d3.select(this).property("value");
                newConfig["space"] = null;
                newConfig["filter"] = {};
              })
              .selectAll("option")
              .data(concepts)
              .enter().append("option")
              .attr("value", option => option.concept.concept)
              .text(option => option.concept.name);

            select.property("selectedIndex", -1);
            
  
          }  

        }
      });
  }

  statusIcons(compatibility){
    return {
      true: "⚫",
      constant: "✳️",
      alreadyInSpace: "♻️", //reset filter on enc
      entityPropertyDataConfig: "🏷", //reset filter on enc
      matchingSpaceAvailable: "➡️",
      subspaceAvailable: "↘️",
      superspaceAvailable: "↗️", //request connstants 
      patialOverlap: "🚧", //request another concept
      noOverlap: "🚧", //request another concept
      false: "❌"
    }[""+compatibility.status];
  }

  getSpaceCompatibilityStatus(encoding){
    const spaces = this.concepts.find(f => f.concept.concept == encoding.data.concept)?.spaces;
    const proposedSpace = this.proposedSpace;

    if (!proposedSpace) return {status: true, spaces: []};
    if (encoding.data.isConstant) return {status: "constant"};

    if (encoding.data.config.modelType == "entityPropertyDataConfig")
      return {status: "entityPropertyDataConfig", spaces: [proposedSpace]};

    if (spacesAreEqual(encoding.data.space, proposedSpace)) 
      return {status: "alreadyInSpace", spaces: [proposedSpace]};

    if (getMatchingSpace(spaces, proposedSpace)) 
      return {status: "matchingSpaceAvailable", spaces: [proposedSpace]};

    const subspaces = getSubspaces(spaces, proposedSpace);
    if (subspaces.length > 0) 
      return {status: "subspaceAvailable", spaces: subspaces};

    const superspaces = getSuperspaces(spaces, proposedSpace);
    if (superspaces.length > 0) 
      return {status: "superspaceAvailable", spaces: superspaces};

    const partialOverlap = getPartiallyOverlappingSpaces(spaces, proposedSpace);
    if (partialOverlap.length > 0) 
      return {status: "patialOverlap", spaces: []};
    if (partialOverlap.length == 0) 
      return {status: "noOverlap", spaces: []};

    return {status: false, spaces: []};
  }



  updateApplyCancelButtons(){
    const hide = !this.proposedSpace || spacesAreEqual(this.proposedSpace, this.model.data.space);
    this.DOM.buttoncancel.classed("vzb-hidden", hide)
      .on("click", () => {this.cancelChanges();});
    this.DOM.buttonapply.classed("vzb-hidden", hide)
      .on("click", () => {this.applyChanges();});
  }
  cancelChanges(){
    this.proposedSpace = null;
    this.toggle();
  }

  applyChanges(){
    if (!this.proposedSpace) return;
    runInAction(()=>{
      this.model.config.data.space = this.proposedSpace;
      Object.keys(this.encNewConfig).forEach(enc => {
        const newConfig = this.encNewConfig[enc];

        if (newConfig.concept)
          this.model.encoding[enc].config.data.concept = newConfig.concept;

        if (newConfig.space)
          this.model.encoding[enc].config.data.space = newConfig.space;
        else if (newConfig.hasOwnProperty("space"))
          delete this.model.encoding[enc].config.data.space;

        if (newConfig.filter)
          this.model.encoding[enc].config.data.filter = newConfig.filter;
        else if (newConfig.hasOwnProperty("filter"))
          delete this.model.encoding[enc].config.data.filter;
          
      });
    });
    this.toggle();
  }

}

_SpaceConfig.DEFAULT_UI = {
};

//export default BubbleChart;
export const SpaceConfig = decorate(_SpaceConfig, {
  "MDL": computed
});