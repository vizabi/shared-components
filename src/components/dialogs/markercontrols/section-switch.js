import { MarkerControlsSection } from "./section.js";
import { decorate, observable } from "mobx";

const ellipsis = (string, n)  => string.length > n ? string.substr(0, n) + "…" : string;

class SectionSwitch extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
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
              name: this.model.data.source.getConcept(concept).name || concept, 
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

  /*
  * isCurrentSetting
  * @returns 
  */
  isCurrentSetting({dim, concept}) {
    const filterModel = this.model.data.filter;
    const isness = filterModel.findOutIsnessUsingLimitedStructure({dim});
    // isness can be null, string: is--country or array of strings: [is--country, is--region]
    if (Array.isArray(isness)) return isness.includes("is--" + concept);
    //empty or invalid filter:
    if (!isness && dim === concept) return true;
    // only one isness -- is this the right one?
    return isness && isness === ("is--" + concept); 
  }

  canResetFilter({dim}) {
    const filterModel = this.model.data.filter;

    const isness = filterModel.findOutIsnessUsingLimitedStructure({dim});
    return !isness || Array.isArray(isness);
  }

  createList() {
    this.DOM.title.text(this.localise("markercontrols/section/switch"));
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
              .attr("id", d => this.id + "--" + d.concept)
              .attr("name", this.id + "--radiogroup")
              .on("change", (event, d) => {
                this.setFilter(d);
                this.parent._clearSearch();
              });

            view.append("label")
              .attr("for", d => this.id + "--" + d.concept)
              .html(d => `<span>${ellipsis(d.name, 20)}</span> <span class="vzb-hint">${d.availabilitySize ? "(" + d.availabilitySize + ")" : ""}</span>`);
          }),
        update => update.selectAll("input")
          .property("checked", d => this.isCurrentSetting(d))
      );

    this.DOM.hint.text(this.localise("markercontrols/section/switchNumberHint").replace("{{dataset}}", this.model.data.source.id) ); 
  }


  example() {
    const data = this.items;
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  resetFilter() {
    if (this.items && this.items[0]) this.setFilter(this.items[0]);
  }

  setFilter({dim, concept, concept_type}) {
    const filter = this.model.data.filter;
    if (!filter) return false;
  
    if (dim === concept)
      //switch to show all possible marks (kill filter spec)
      filter.clearFilterUsingLimitedStructure({dim});
    else if (concept_type === "boolean")
      console.error(`switch command for concept_type=boolean ${concept} is not implemented`);
    else 
      filter.switchIsenssUsingLimitedStructure({dim, isness: "is--" + concept});
  }

  updateSearch(text = "") {
    let hiddenItems = 0;
    const items = this.DOM.list.selectAll(".vzb-item")
      .classed("vzb-hidden", d => {
        const hidden = text && !d.name.toString().toLowerCase().includes(text);
        hiddenItems += +hidden;
        return hidden;
      })
      .classed("vzb-current-choice", d => {
        return this.isCurrentSetting(d) && !this.parent.isFullscreenish();
      });
    this.showHideHeader(items.size() - hiddenItems);
    this.DOM.hint.classed("vzb-hidden", !(items.size() - hiddenItems));
  }

  concludeSearch(text = "") {
    const item = this.items.find(f => text && f.name.toString().toLowerCase().includes(text) && !this.isCurrentSetting(f));
    if (item) this.setFilter(item);
  }

}

const decorated = decorate(SectionSwitch, {
  "items": observable
});

export { decorated as SectionSwitch };