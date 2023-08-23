import { MarkerControlsSection } from "./section.js";
import {decorate, computed, runInAction, observable} from "mobx";
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

function removeDulicates(space){
  const result = [];
  space.forEach(space => {
    if(!result.some(s => spacesAreEqual(s.space, space.space)))
      result.push(space);
  });
  return result;
}

class SectionSlice extends MarkerControlsSection {
  constructor(config) {
    super(config);

    this.showAllEncs = false;
    this.proposedSpace = null;
    this.goodToGo = false;
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Slice");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    
    this.DOM.actionSummary = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-actionsummary");

    this.DOM.encodings = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-encodings");

    this.DOM.buttonShowAllEncs = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-showallencs")
      .text("•••")
      .on("click", () => { this.showAllEncs = !this.showAllEncs; });

    this.DOM.buttons = this.DOM.content.append("div").attr("class", "vzb-spaceconfig-buttons");
    this.DOM.buttonapply = this.DOM.buttons.append("div").attr("class", "vzb-spaceconfig-button-apply");
    this.DOM.buttoncancel = this.DOM.buttons.append("div").attr("class", "vzb-spaceconfig-button-cancel");
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
    this.addReaction(this.updateEncodigns);
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

  _getMarkerSpaceAvailability(){
    const items = [];
    const allowedConcetTypes = ["entity_domain", "time"];
    this._getAllDataSources().forEach(ds => {
      ds.availability.keyLookup.forEach(space => {
        if (space.every(f => allowedConcetTypes.includes(ds.getConcept(f).concept_type))) items.push({space, dsId: ds.id});
      });
    });
    const currentSpace = this.model.data.space;
    const frameConcept = this.MDL.frame.data.concept;

    return items.map(item => ({
      dsId: item.dsId,
      space: item.space.toSorted((a) => {
        //first element in current space will be listed first
        if (currentSpace.indexOf(a) === 0) return -1;
        //elements missing from current space will be listed in the middle
        if (currentSpace.indexOf(a) === -1) return 0;
        //time concepts go last
        if (a === frameConcept) return 1;
      })
    }));
  }

  createList() {
    this.proposedSpace; //watch to successfully reset radiobuttons on cancel/back
    const frameConcept = this.MDL.frame.data.concept;
    const spaceAvailability = removeDulicates(this._getMarkerSpaceAvailability().filter(f => f.space.includes(frameConcept)));
    
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
          .property("checked", d => spacesAreEqual(d.space, this.proposedSpace?.space || this.model.data.space))
        //   .
      )
      .attr("class", "vzb-item");
  }

  _proposeSpace(proposedSpace) {
    if(!this.parent.isFullscreenish()) this.parent.toggleFullscreenish(this);
    this.proposedSpace = proposedSpace;
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
  _conceptsCompatibleWithMarkerSpace(availabilityMapByConcepts, markerSpace, strict){
    const filteredValueLookup = new Map();
    const markerSpaceSet = new Set(markerSpace);
    const intersect = (a,b) => a.filter(e => b.has(e));
    for (const [concept, {source, spaces}] of availabilityMapByConcepts) {  
      const filteredSpaces = [...spaces].filter(space => {
        const intersection = intersect(space, markerSpaceSet);
        const fullOverlap = space.length == markerSpaceSet.size;
        const partialOverlap = intersection.length == markerSpaceSet.size || intersection.length == space.length;
        return strict && fullOverlap || !strict && partialOverlap;
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

  updateEncodigns(proposedSpace = this.proposedSpace){
    const _this = this;
    const encs = this.model.encoding;

    const nest = this._nestAvailabilityByConcepts(this._getAvailability());
    //const filtervl = this._conceptsCompatibleWithMarkerSpace(nest, this.model.data.space);
    this.concepts = this._convertConceptMapToArray(nest);
    this.encNewConfig = {};

    const encodingStatus = this.getEncodings().map(enc => ({
      enc,
      status: _this.getSpaceCompatibilityStatus(encs[enc], proposedSpace?.space)
    }));

    const isRequired = (enc) => !this.model.requiredEncodings || this.model.requiredEncodings.includes(enc);
    const allRequiredAreInSubspace = encodingStatus.every(({enc, status}) => status.status === "subspaceAvailable" || !isRequired(enc));

    const someActionRequired = encodingStatus.some(({enc, status}) => status.actionReqired)
    const alreadyInSpace = proposedSpace?.space && spacesAreEqual(proposedSpace.space, this.model.data.space);

    this.DOM.actionSummary
      .classed("vzb-hidden", !proposedSpace)
      .text(
        someActionRequired
          ? "Pls review the following:"
          : allRequiredAreInSubspace 
            ? "Not all data is available " + _this._getText(proposedSpace)
                + ". Switch at least one of the visual encodings below to a different measure:"
            : alreadyInSpace
              ? "This is the current setting"
              : "Good to go!"
      );

    this.goodToGo = !someActionRequired && !allRequiredAreInSubspace && !alreadyInSpace;

    this.DOM.encodings
      .html("")
      .selectAll("div")
      .data(encodingStatus, d => d.enc)
      .enter().append("div")
      .attr("class", "vzb-spaceconfig-enc")
      .each(function({enc, status}){
        const view = d3.select(this);

        const encoding = encs[enc];
        const concept = _this.concepts.find(f => f.concept.concept == encoding.data.concept);
        const isSpaceSet = encoding.data.config.space;
        const newConfig = _this.encNewConfig[enc] = {};

        const DOM = {
          status: view.append("div")
            .attr("class", "vzb-spaceconfig-enc-status")
            .attr("title", status.status)
            .text(_this.statusIcons(status)),

          name: view.append("div")
            .attr("class", "vzb-spaceconfig-enc-name")
            .text(enc),
          concept: view.append("div")
            .attr("class", "vzb-spaceconfig-enc-concept"),
          spaceCurrent: view.append("div")
            .attr("for", "vzb-spaceconfig-enc-space-current")
            .classed("vzb-hidden", !_this.showAllEncs),
          spaceNew: view.append("div")
            .attr("for", "vzb-spaceconfig-enc-space-new")
            .classed("vzb-hidden", !_this.showAllEncs),
        };
        

        
        if(status.status == "constant"){
          DOM.concept.text("constant: " + encoding.data.constant);

        }else{

          DOM.concept
            .text(concept.concept.name);
          DOM.spaceCurrent
            .text("current space: " + encoding.data.space.join() + (isSpaceSet? " (set)" : " (inherited)") );
          
          if(status.status == "alreadyInSpace" || status.status == "entityPropertyDataConfig") {
            DOM.spaceNew.text("new space: " + (isSpaceSet ? " will reset to marker space" : "no change"));

            if(isSpaceSet) newConfig["space"] = null;
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }

          if(status.status == "matchingSpaceAvailable") {
            DOM.spaceNew.text("new space: " + status.spaces[0].join() + (isSpaceSet? " (set)" : " (inherited)"));

            if(isSpaceSet) newConfig["space"] = null;
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }     
          
          if(status.status == "subspaceAvailable") {
            DOM.spaceNew.text("new space: " + status.spaces[0].join() + " (set)");

            newConfig["space"] = status.spaces[0];
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }  

          if(status.status == "superspaceAvailable") {
            DOM.spaceNew.text("new space: " + status.spaces[0].join() + " (set)");

            newConfig["space"] = status.spaces[0];
            if(encoding.data.config.filter) newConfig["filter"] = {};
          }  

          if(status.status == "patialOverlap" || status.status == "noOverlap" || allRequiredAreInSubspace && isRequired(enc)) {
            DOM.concept.classed("vzb-hidden", true);
            DOM.spaceNew.text("new space: not avaiable");

            const filtervl = _this._conceptsCompatibleWithMarkerSpace(nest, proposedSpace.space, allRequiredAreInSubspace && isRequired(enc));
            const concepts = [concept].concat(_this._convertConceptMapToArray(filtervl));
  
            const select = view.append("select")
              .attr("class", "vzb-spaceconfig-enc-concept-new")
              .attr("id", "vzb-spaceconfig-enc-space-select")
              .on("change", function(){
                _this.goodToGo = true;
                newConfig["concept"] = d3.select(this).property("value");
                newConfig["space"] = null;
                newConfig["filter"] = {};
              });
              
            select
              .selectAll("option")
              .data(concepts)
              .enter().append("option")
              .property("selected", option => option.concept.concept === concept.concept.concept)
              .property("disabled", option => option.concept.concept === concept.concept.concept)
              .attr("value", option => option.concept.concept)
              .text(option => option.concept.name);
  
          }  
        }

        view.classed("vzb-hidden", !status.actionReqired && !_this.showAllEncs && !(allRequiredAreInSubspace && isRequired(enc)));
      });
  }

  getSpaceCompatibilityStatus(encoding, space){
    const spaces = this.concepts.find(f => f.concept.concept == encoding.data.concept)?.spaces;

    if (!space) return {status: true, spaces: []};
    if (encoding.data.isConstant) return {status: "constant"};

    if (encoding.data.config.modelType == "entityPropertyDataConfig")
      return {status: "entityPropertyDataConfig", spaces: [space]};

    if (spacesAreEqual(encoding.data.space, space)) 
      return {status: "alreadyInSpace", spaces: [space]};

    if (getMatchingSpace(spaces, space)) 
      return {status: "matchingSpaceAvailable", spaces: [space]};

    const subspaces = getSubspaces(spaces, space);
    if (subspaces.length > 0) 
      return {status: "subspaceAvailable", spaces: subspaces};

    const superspaces = getSuperspaces(spaces, space);
    if (superspaces.length > 0) 
      return {status: "superspaceAvailable", spaces: superspaces};

    const partialOverlap = getPartiallyOverlappingSpaces(spaces, space);
    if (partialOverlap.length > 0) 
      return {status: "patialOverlap", actionReqired: true, spaces: []};
    if (partialOverlap.length == 0) 
      return {status: "noOverlap", actionReqired: true, spaces: []};

    return {status: false, spaces: []};
  }

  statusIcons(compatibility){
    return {
      true: "⚫",
      constant: "✳️",
      alreadyInSpace: "✅", //reset filter on enc
      entityPropertyDataConfig: "🏷", //reset filter on enc
      matchingSpaceAvailable: "⏩",
      subspaceAvailable: "🔽",
      superspaceAvailable: "🔼", //request connstants 
      patialOverlap: "🚧", //request another concept
      noOverlap: "🚧", //request another concept
      false: "❌"
    }[""+compatibility.status];
  }


  updateApplyCancelButtons(proposedSpace = this.proposedSpace){
    const hide = !proposedSpace || spacesAreEqual(proposedSpace.space, this.model.data.space);
    this.DOM.buttoncancel.classed("vzb-hidden", hide)
      .on("click", () => {this.cancelChanges();});
    this.DOM.buttonapply.classed("vzb-hidden", hide)
      .classed("vzb-disabled", !this.goodToGo)
      .on("click", () => {this.applyChanges(proposedSpace);});
  }
  cancelChanges(){
    this.parent.toggleFullscreenish();
    this.proposedSpace = null;
    this.showAllEncs = false;
  }

  applyChanges(proposedSpace){
    if (!proposedSpace) return;
    runInAction(()=>{
      this.model.config.data.space = proposedSpace.space;
      this.model.encoding["label"].data.config.source = proposedSpace.dsId;
      Object.keys(this.encNewConfig).forEach(enc => {
        const newConfig = this.encNewConfig[enc];

        if (newConfig.concept) {
          this.model.encoding[enc].config.data.concept = newConfig.concept;

          this.model.encoding[enc].config.scale.domain = null;
          this.model.encoding[enc].config.scale.type = null;
          this.model.encoding[enc].config.scale.zoomed = null;
          this.model.encoding[enc].config.scale.palette = {};
        }

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
    this.proposedSpace = null;
    this.showAllEncs = false;
  }  

  _getItemId(space) {
    return this.id + "--radioitem--" + space.space.toSorted().join("-");
  }
  _getText(space) {
    const dataSources = this._getAllDataSources();
    const ELLIPSIS = 10;

    return "by " + space.space      
      .map(d => dataSources.find(ds => ds.getConcept(d)).getConcept(d)?.name || d)
      .map(m => m.length > ELLIPSIS ? m.substring(0, ELLIPSIS) + "…" : m)
      .join(", ");
  }

  _getAllDataSources(dsConfig = this.root.model.config.dataSources) {
    return Object.keys(dsConfig).map(dsName => this.services.Vizabi.Vizabi.stores.dataSources.get(dsName));
  }

  updateSearch(text = "") {
    let hiddenItems = 0;
    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hidden = 0
          || spacesAreEqual(d.space, this.model.data.space) && !this.parent.isFullscreenish()
          || text && !this._getText(d).toString().toLowerCase().includes(text) && !d.space.includes(text);
        hiddenItems += hidden;
        return hidden;
      });
    this.showHideHeader(items.size() - hiddenItems);
  }
}

const decorated = decorate(SectionSlice, {
  "MDL": computed,
  "showAllEncs": observable,
  "proposedSpace": observable,
  "goodToGo": observable,
});

export {decorated as SectionSlice};
