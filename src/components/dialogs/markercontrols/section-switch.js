import * as utils from "../../../legacy/base/utils.js";
import { MarkerControlsSection } from "./section.js";
import { decorate, computed, runInAction, observable } from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");

const ellipsis = (string, n)  => string.length > n ? string.substr(0, n) + "…" : string;

class SectionSwitch extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Switch to");
    this.DOM.list = this.DOM.content.append("div").attr("class", "vzb-list");
    this.DOM.hint = this.DOM.content.append("div").attr("class", "vzb-hint");
    this.items = [];
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.getListData);
    this.addReaction(this.createList);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }

  getListData() {

    const getAvailabilitySize = (concept, dim, concept_type) => {
      const frameDim = this.MDL.frame.data.concept;
      const createKeyStr = (space) => space.toSorted().join("¬");
      const space = concept_type === "boolean" ? [dim, frameDim] : [concept, frameDim];
      return this.model.data.source.availability.keyValueLookup.get(createKeyStr(space))?.size;
    };

    const items = [];
    this.model.data.spaceCatalog.then(spaceCatalog => {
      for (const dim in spaceCatalog) {

        if (spaceCatalog[dim].entities && spaceCatalog[dim].properties) {

          const entityProps = spaceCatalog[dim].properties;
          const newitems = Object.keys(entityProps)
            .filter(f => f.includes("is--") || entityProps[f].concept.concept_type === "boolean")
            .map(m => m.replace("is--", ""))
            .map(concept => ({
              dim, 
              concept, 
              concept_type: this.model.data.source.getConcept(concept).concept_type, 
              name: this.model.data.source.getConcept(concept).name, 
              availabilitySize: getAvailabilitySize(concept, dim, this.model.data.source.getConcept(concept).concept_type)
            }))
            .concat({
              dim,
              concept: dim,
              concept_type: "entity_domain",
              name: this.model.data.source.getConcept(dim).name, 
              availabilitySize: getAvailabilitySize(dim)
            })
            .filter(f => f.availabilitySize)
            .toSorted((a, b) => b.availabilitySize - a.availabilitySize);

          items.push(newitems);
        }

      }

      this.items = items.flat();
      
    });
  }

  isCurrentSetting(d) {
    const filterDim = this.model.data.filter.dimensions[d.dim];
    if (!filterDim) return false;
    return filterDim[d.concept] || filterDim["is--" + d.concept] || false;
  }

  createList() {
    const list = this.DOM.list;
    this.model.data.filter;

    this.DOM.listItems = list.selectAll("div")
      .data(this.items, d => d.concept)
      .join(
        enter => enter.append("div")
          .attr("class", "vzb-item")
          .call(view => {
            view.append("input")
              .attr("type", "radio")
              .attr("id", d => d.concept)
              .attr("name", this.id + "--radiogroup")
              .on("change", (event, d) => this.setFilter(d));

            view.append("label")
              .attr("for", d => d.concept)
              .html(d => `<span>${ellipsis(d.name, 20)}</span> <span class="vzb-hint">${d.availabilitySize ? "(" + d.availabilitySize + ")" : ""}</span>`);
          }),
        update => update.selectAll("input")
          .property("checked", d => this.isCurrentSetting(d))
      );

    this.DOM.hint.text("number shows how many measures are available in dataset " + this.model.data.source.id + " for each of the options above");
  }


  example() {
    const data = this.items;
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  setFilter({dim, concept, concept_type}) {
    const filter = this.model.data.filter.config.dimensions;
    if (!filter) return false;
    if (dim === concept)
      filter[dim] = null;
    else 
      filter[dim] = {
        "$or": [{
          [concept_type === "boolean" ? concept : ("is--" + concept)]: true
        }]
      };
  }

  updateSearch(text = "") {
    let hiddenItems = 0;
    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hidden = 0
        || this.isCurrentSetting(d) && !this.parent.isFullscreenish()
        || text && !d.name.toString().toLowerCase().includes(text);
        hiddenItems += +hidden;
        return hidden;
      });
    this.showHideHeader(items.size() - hiddenItems);
    this.DOM.hint.classed("vzb-hidden", !(items.size() - hiddenItems));
  }

  concludeSearch(text = "") {
    runInAction(() => {
      const data = [...this.parent.markersData.values()];
      const filtered = data.filter(f => (f.name || "").toString().toLowerCase().includes(text));
      if (filtered.length === 1) {
        this.MDL.selected.data.filter.toggle(filtered[0]);
        this.updateSearch();
      }
    });
  }

}

const decorated = decorate(SectionSwitch, {
  "items": observable
});

export { decorated as SectionSwitch };