import { MarkerControlsSection } from "./section.js";
import {decorate, computed, runInAction} from "mobx";
import * as d3 from "d3";

function spacesAreEqual(a, b){
  return a.toSorted().join() === b.toSorted().join();
}

const longestFirst = (a,b) => b.length - a.length;
const shortestFirst = (a,b) => a.length - b.length;

function getMatchingSpace(spaces, targetSpace){
  return spaces.find(s => spacesAreEqual(s, targetSpace));
}

function getSubspaces(spaces, targetSpace){
  return spaces.filter(s => s.every(dim => targetSpace.includes(dim)))
    .toSorted(longestFirst);
}

function getSuperspaces(spaces, targetSpace){
  return spaces.filter(s => targetSpace.every(dim => s.includes(dim)))
    .toSorted(shortestFirst);
}

function getPartiallyOverlappingSpaces(spaces, targetSpace){
  return spaces.filter(s => targetSpace.some(dim => s.includes(dim)))
    .toSorted(shortestFirst);
}

function removeDulicates(array){
  const result = [];
  array.forEach(space => {
    if(!result.some(s => spacesAreEqual(s, space)))
      result.push(space);
  });
  return result;
}

class SectionSlice extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Slice");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    this.DOM.encodings = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-encodings");

    this.DOM.buttons = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-buttons");
    this.DOM.buttoncancel = this.DOM.buttons.append("div").attr("class", "vzb-spaceconfig-button-cancel");
    this.DOM.buttonapply = this.DOM.buttons.append("div").attr("class", "vzb-spaceconfig-button-apply");
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updateUIstrings);
    this.addReaction(this.updateApplyCancelButtons);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
    };
  }

  updateUIstrings(){
    this.DOM.buttoncancel.text("Cancel");
    this.DOM.buttonapply.text("Apply");
  }


  createList() {      
    const frameConcept = this.MDL.frame.data.concept;
    const spaceAvailability = removeDulicates(this._getMarkerSpaceAvailability().filter(f => f.includes(frameConcept)));
    
    this.DOM.list.selectAll("div")
      .data(spaceAvailability, this._getItemId)
      .join(
        enter => enter.append("div")
          .call(view => {
            view.append("input")
              .attr("type", "radio")
              .attr("id", this._getItemId)
              .attr("name", this.id + "--radiogroup")
              .on("change", (event, d) => {
                this._proposeSpace(d);
              });

            view.append("label")
              .attr("for", this._getItemId)
              .text(this._getText.bind(this));
          }),
        update => update.select("input")
          .property("checked", d => spacesAreEqual(d, this.model.data.space))
        //   .
      )
      .attr("class", "vzb-item");
  }

  _proposeSpace(proposedSpace) {
    if(!this.parent.isFullscreenish()) this.parent.toggleFullscreenish(this);
    this.updateEncodigns(proposedSpace);
    this.updateApplyCancelButtons(proposedSpace);
    // this.updateApplyCancelButtons();
  }

  getEncodings(){
    const encs = this.model.encoding;
    return Object.keys(encs).filter(enc => {
      if (!this.model.requiredEncodings || this.model.requiredEncodings.includes(enc)) return true;
      if (enc == "color") return true;
      if (enc == "label") return true;
    });
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

  _nestAvailabilityByConcepts(availability){
    return availability.reduce((map, kv) => {
      const key = kv.value;
      const space = kv.key;
      if (!map.has(key)) map.set(key, {source: kv.source, spaces: new Set()});
      map.get(key).spaces.add(space);
      return map;
    }, new Map());
  }

  updateEncodigns(proposedSpace){
    const _this = this;
    const encs = this.model.encoding;

    const nest = this._nestAvailabilityByConcepts(this._getAvailability());
    //const filtervl = this._conceptsCompatibleWithMarkerSpace(nest, this.model.data.space);
    this.concepts = this._convertConceptMapToArray(nest);
    this.encNewConfig = {};

    this.DOM.encodings
      .html("")
      .selectAll("div")
      .data(this.getEncodings(), d=>d)
      .enter().append("div")
      .each(function(enc){
        const view = d3.select(this);

        const encoding = encs[enc];
        const status = _this.getSpaceCompatibilityStatus(encoding, proposedSpace);
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

  getSpaceCompatibilityStatus(encoding, proposedSpace){
    const spaces = this.concepts.find(f => f.concept.concept == encoding.data.concept)?.spaces;

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


  updateApplyCancelButtons(proposedSpace){
    const hide = !proposedSpace || spacesAreEqual(proposedSpace, this.model.data.space);
    this.DOM.buttoncancel.classed("vzb-hidden", hide)
      .on("click", () => {this.cancelChanges();});
    this.DOM.buttonapply.classed("vzb-hidden", hide)
      .on("click", () => {this.applyChanges(proposedSpace);});
  }
  cancelChanges(){
    this.parent.toggleFullscreenish();
  }

  applyChanges(proposedSpace){
    if (!proposedSpace) return;
    runInAction(()=>{
      this.model.config.data.space = proposedSpace;
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
    this.parent.toggleFullscreenish();
  }  

  _getItemId(space) {
    return this.id + "--radioitem--" + space.toSorted().join("-");
  }
  _getText(space) {
    const dataSources = this._getAllDataSources();
    
    return space      
      .map(d => dataSources.find(ds => ds.getConcept(d)).getConcept(d)?.name || d)
      .join(", ") || "";
  }

  _getAllDataSources(dsConfig = this.root.model.config.dataSources) {
    return Object.keys(dsConfig).map(dsName => this.services.Vizabi.Vizabi.stores.dataSources.get(dsName));
  }

  _getMarkerSpaceAvailability(){
    const items = [];
    const allowedConcetTypes = ["entity_domain", "time"];
    this._getAllDataSources().forEach(ds => {
      ds.availability.keyLookup.forEach(space => {
        if (space.every(f => allowedConcetTypes.includes(ds.getConcept(f).concept_type))) items.push(space);
      });
    });
    const currentSpace = this.model.data.space;
    const frameConcept = this.MDL.frame.data.concept;

    return items.map(space => space.toSorted((a) => {
      //first element in current space will be listed first
      if (currentSpace.indexOf(a) === 0) return -1;
      //elements missing from current space will be listed in the middle
      if (currentSpace.indexOf(a) === -1) return 0;
      //time concepts go last
      if (a === frameConcept) return 1;
    }));
  }

  updateSearch(text = "") {
    this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        return 0
          || spacesAreEqual(d, this.model.data.space) && !this.parent.isFullscreenish()
          || text && !this._getText(d).toString().toLowerCase().includes(text) && !d.includes(text);
      });
  }
}

const decorated = decorate(SectionSlice, {
  "MDL": computed
});

export {decorated as SectionSlice};
