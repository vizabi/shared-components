

import { BaseComponent } from "../base-component";
import * as Utils from "../../utils.js"; 
import {runInAction, decorate, computed, toJS} from "mobx";
import * as d3 from "d3";

import "./addgeo.scss";
export class _AddGeo extends BaseComponent {

  constructor(config){
    config.template = `
      <div class="vzb-addgeo-background vzb-hidden"></div>
      <div class="vzb-addgeo-button"></div>
      <input class="vzb-addgeo-searchbox vzb-hidden" type="search" required="" placeholder="Search...">
      <ul class="vzb-addgeo-matches vzb-hidden"></ul>
      </div>
    `
    config.subcomponents = [];
   
    super(config);
  }

  setup(options) {
    const _this = this;

    this.DOM = {
      background: this.element.select(".vzb-addgeo-background"),
      button: this.element.select(".vzb-addgeo-button"),
      searchbox: this.element.select(".vzb-addgeo-searchbox"),
      matches: this.element.select(".vzb-addgeo-matches")
    };

    this.catalog = [];
    this.entitySetsColorScale = d3.scaleOrdinal(d3.schemePastel2);
    this.element.classed("vzb-hidden", true);

    this.DOM.button.on("click", () => {
      _this.DOM.searchbox.classed("vzb-hidden", false).node().focus();
      _this.DOM.background.classed("vzb-hidden", false);
      _this.root.children.forEach(c => {
        c.element.classed("vzb-blur", c != _this);
      });
    })

    this.DOM.searchbox.on("keyup", function(event){
      _this.search(this.value);
      if(event.key === "Escape") {
        _this.cancelSearch()
      }
    });

    this.DOM.background.on("click", () => {
      this.cancelSearch();
    });

    this.PROFILE_CONSTANTS = options.PROFILE_CONSTANTS;
    this.PROFILE_CONSTANTS_FOR_PROJECTOR = options.PROFILE_CONSTANTS_FOR_PROJECTOR;
    this.xAlign = options.xAlign;
    this.yAlign = options.yAlign;
  }

  draw(){
    this.localise = this.services.locale.auto();
    this.addReaction(this.buildList);
    this.addReaction(this.updateSize);
    this.addReaction(this.redraw);
  }
  
  redraw(){
    this.element.classed("vzb-hidden", this.activePreset.mode !== "show");
    this.DOM.button.text(this.localise("buttons/addgeo"));
    this.DOM.searchbox.attr("placeholder", this.localise("buttons/addgeo"));
  }


  updateSize() {
    this.services.layout.size; //watch

    this.profileConstants = this.services.layout.getProfileConstants(this.PROFILE_CONSTANTS, this.PROFILE_CONSTANTS_FOR_PROJECTOR);

    const {
      margin,
      dy,
      dx,
    } = this.profileConstants;

    this.element.style("top", this.yAlign == "top" ? margin.top + (dy||0) + "px" : null);
    this.element.style("bottom", this.yAlign == "bottom" ? margin.bottom + (dy||0) + "px" : null);
    this.element.style("left", this.xAlign == "left" ? margin.left + (dx||0) + "px" : null);
    this.element.style("right", this.xAlign == "right" ? margin.right + (dx||0) + "px" : null);
  }

  get activePreset(){
    const PRESETS = toJS(this.root.model.config.presets) || PRESETS_DEFAULT;

    PRESETS.flat().forEach(p => {
      p.score = Utils.computeObjectsSimilarityScore(p.config, toJS(this.model.config), "is--"); 
    })      
    const topScore = d3.max(PRESETS.flat(), d => d.score);
    return PRESETS.flat().find(f => f.score === topScore);
  }

  buildList(){
    this.model.data.spaceCatalog.then(spaceCatalog => {
      for (const dim in spaceCatalog) {
        const filterSpec = this.model.encoding.show.data.filter.dimensions[dim];
        if (spaceCatalog[dim].entities) this.catalog = [...spaceCatalog[dim].entities.filter(filterSpec).values()];
      };
    });
  }

  cancelSearch(){
    this.DOM.searchbox.classed("vzb-hidden", true);
    this.DOM.searchbox.node().value = "";
    this.DOM.matches.selectAll("li").remove();
    this.DOM.matches.classed("vzb-hidden", true);
    this.DOM.background.classed("vzb-hidden", true);

    this.root.children.forEach(c => {
      c.element.classed("vzb-blur", false);
    });
  }

  search(string){
    if(!string || string.length < 3) {
      this.DOM.matches.selectAll("li").remove();
      this.DOM.matches.classed("vzb-hidden", true);
      return;
    }

    const matches = this.catalog.filter(f => f.name.toLowerCase().trim().includes(string.toLowerCase().trim()) || f[Symbol.for("key")].includes(string.toLowerCase().trim()))
      .map(d => {
        d.isness = Object.keys(d).filter(f => f.includes("is--") && d[f]).map(m => {
          return {
            id: m,
            name: this.model.data.source.getConcept(m.replace("is--",""))?.name
          }
        });
        return d;
      })
      .sort((x, y) => d3.ascending(x.isness.map(k => k.id).join(), y.isness.map(k => k.id).join()));
    
    this.DOM.matches.classed("vzb-hidden", !matches.length);
    this.DOM.matches.selectAll("li").remove();
    this.DOM.matches.selectAll("li")
      .data(matches)
      .enter().append("li")
      .html((d) => {
        return d.name + d.isness.map(m => `<span class="vzb-dialog-isness" style="background-color:${this.entitySetsColorScale(m.id)}">${m.name}</span>`).join("");
      })
      .on("click", (event, d) => {
        this.model.data.filter.addToDimensionsFirstINstatement(d, this.activePreset.loosePath);
        this.cancelSearch();
      });
  }

}

export const AddGeo = decorate(_AddGeo, {
  "activePreset": computed
});