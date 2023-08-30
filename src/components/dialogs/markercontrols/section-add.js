import { computed, decorate, toJS } from "mobx";
import { MarkerControlsSection } from "./section.js";
import * as d3 from "d3";

const KEY = Symbol.for("key");

class SectionAdd extends MarkerControlsSection {
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
    this.localise = this.services.locale.auto();

    this.addReaction(this.buildList);
  }

  updateSearch(text = "") {
    this.search(text);
  }

  concludeSearch(text = "") {
    this.search();
  }

  buildList() {
    this.model.encoding.label.data.spaceCatalog.then(spaceCatalog => {
      for (const dim in spaceCatalog) {
        const filterSpec = this.model.encoding?.show?.data?.filter?.dimensions?.[dim] || {};
        if (spaceCatalog[dim].entities) {
          const dimOrAndIn = this.model.data.filter.dimensions?.[dim]?.$or?.[0]?.$and?.[dim]?.$in || [];
          const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.[1]?.[dim]?.$in || [];
          this.catalog = [...spaceCatalog[dim].entities.filter(filterSpec).values()].filter(f => {
            return !this.parent.markersData.has(f[Symbol.for("key")]) &&
              !dimOrAndIn.includes(f[Symbol.for("key")]) &&
              !dimOrIn.includes(f[Symbol.for("key")]);
          });
          this.dim = dim;
        }
      }
    });
  }

  example() {
    const data = this.catalog;
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  search(string) {
    if(string && string.length < 2) {
      this.DOM.matches.selectAll("li").remove();
      this.DOM.matches.classed("vzb-hidden", true);
      this.showHideHeader();
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
        const dimOrAndNin = this.model.data.filter.dimensions?.[this.dim]?.$or?.[0]?.$and?.[0]?.[this.dim]?.$nin || [];
        if (dimOrAndNin.includes(d[KEY])) {
          this.model.data.filter.deleteFromDimensionsAllINstatements(d, "$nin");
        } else {
          this.model.data.filter.addToDimensionsFirstINstatement(d, [this.dim, "$or", 1, this.dim, "$in"]);
        }
        this.concludeSearch();
      });

    this.showHideHeader(matches.length);
  }
}

const decorated = decorate(SectionAdd, {
});

export {decorated as SectionAdd};