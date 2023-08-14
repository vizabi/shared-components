import { computed, decorate, toJS } from "mobx";
import { MarkerControlsSection } from "./section.js";
import * as d3 from "d3";

class _SectionAdd extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Add");
    this.DOM.matches = this.DOM.content.append("ul").attr("class", "vzb-addgeo-matches");

    this.catalog = [];
    this.entitySetsColorScale = d3.scaleOrdinal(d3.schemePastel2);
  }

  draw() {
    this.KEY = Symbol.for("key");

    this.localise = this.services.locale.auto();

    this.addReaction(this.buildList);
  }

  updateSearch(text = "") {
    this.search(text);
  }

  concludeSearch(text = "") {
    this.search();
  }

  get activePreset(){
    const PRESETS = toJS(this.root.model.config.presets);

    PRESETS.flat().forEach(p => {
      p.score = Utils.computeObjectsSimilarityScore(p.config, toJS(this.model.config), "is--"); 
    });
    const topScore = d3.max(PRESETS.flat(), d => d.score);
    return PRESETS.flat().find(f => f.score === topScore);
  }

  buildList(){
    this.model.data.spaceCatalog.then(spaceCatalog => {
      for (const dim in spaceCatalog) {
        const filterSpec = this.model.encoding?.show?.data?.filter?.dimensions?.[dim] || {};
        if (spaceCatalog[dim].entities) this.catalog = [...spaceCatalog[dim].entities.filter(filterSpec).values()];
      }
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
          };
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

export const SectionAdd = decorate(_SectionAdd, {
  "activePreset": computed
});
