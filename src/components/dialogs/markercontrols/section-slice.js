import { MarkerControlsSection } from "./section.js";
import {decorate, computed} from "mobx";
import * as d3 from "d3";

function spacesAreEqual(a, b){
  return a.toSorted().join() === b.toSorted().join();
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
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
    };
  }



  createList() {      
    const frameConcept = this.MDL.frame.data.concept;
    const spaceAvailability = removeDulicates(this._getSpaceAvailability().filter(f => f.includes(frameConcept)));
    
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

  _proposeSpace(space) {
    if(!this.parent.isFullscreenish()) this.parent.toggleFullscreenish(this);
    // this.updateEncodigns();
    // this.updateApplyCancelButtons();
    //_this.model.config.data.space = space;
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

  _getSpaceAvailability(){
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
