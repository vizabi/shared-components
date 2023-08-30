import { MarkerControlsSection } from "./section.js";
import { computed, decorate, toJS } from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");

class SectionRemove extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Remove");
    this.DOM.matches = this.DOM.content.append("ul").attr("class", "vzb-remove-matches");

    this.catalog = [];
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);

  }

  updateSearch(text = "") {
    this.search(text);
  }

  concludeSearch(text = "") {
    this.search();
  }

  createList() {
    const dim = this.dim = this.model.encoding.label.data.commonSpace[0];
    
    this.model.encoding.label.data.spaceCatalog.then(spaceCatalog => {
      const dataKeys = [...this.parent.markersData.keys()];
      const dimOrAndIn = this.model.data.filter.dimensions?.[dim]?.$or?.[0]?.$and?.[0]?.[dim]?.$in || [];
      const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.[1]?.[dim]?.$in || [];
      const markersFromIn = [...new Set([...dimOrAndIn, ...dimOrIn])]
        .filter(d => !dataKeys.includes(d))
        .map(d => {
          for (const dim in spaceCatalog) {
            if (spaceCatalog[dim].entities && spaceCatalog[dim].entities.has(d)) {
              const entity = spaceCatalog[dim].entities.get(d)
              return ({
                [KEY]: entity[KEY],
                [dim]: entity[dim],
                name: entity.name,
              });
            }
          }
          return ({
            [KEY]: d,
            name: d
          })
        });

      this.catalog = [...this.parent.markersData.values(), ...markersFromIn];
    });

  }

  search(string){
    if(string && string.length < 2) {
      this.DOM.matches.selectAll("li").remove();
      this.DOM.matches.classed("vzb-hidden", true);
      this.showHideHeader();
      return;
    }

    const matches = this.catalog.filter(f => f.name.toLowerCase().trim().includes(string.toLowerCase().trim()) || f[Symbol.for("key")].includes(string.toLowerCase().trim()));

    this.DOM.matches.classed("vzb-hidden", !matches.length);
    this.DOM.matches.selectAll("li").remove();
    this.DOM.matches.selectAll("li")
      .data(matches)
      .enter().append("li")
      .html((d) => {
        return d.name;
      })
      .on("click", (event, d) => {
        const dim = this.dim;
        const dimOrAndIn = this.model.data.filter.dimensions?.[dim]?.$or?.[0]?.$and?.[0]?.[dim]?.$in || [];
        const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.[1]?.[dim]?.$in || [];

        const markerIn$In = dimOrIn.includes(d[KEY]) || dimOrAndIn.includes(d[KEY]);
        if (markerIn$In) {
          this.model.data.filter.deleteFromDimensionsAllINstatements(d);
        } else {
          this.model.data.filter.addToDimensionsFirstINstatement(d, [dim, "$or", 0, "$and", 0, dim, "$nin"]);
        }
        
        this.concludeSearch();
      });

    this.showHideHeader(matches.length);
  }

}

const decorated = decorate(SectionRemove, {
});

export {decorated as SectionRemove};