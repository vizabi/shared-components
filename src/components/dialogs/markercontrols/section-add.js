import { computed, decorate, toJS } from "mobx";
import { MarkerControlsSection } from "./section.js";
import * as utils from "../../../legacy/base/utils";
import * as d3 from "d3";

const KEY = Symbol.for("key");
//¬

class SectionAdd extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Add");
    this.DOM.matches = this.DOM.content.append("ul").attr("class", "vzb-addgeo-matches");

    this.catalog = [];
    this.allCatalog = [];
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

  _getKey(element, key, dim) {
    return dim + "¬" + key + "¬" + element;
  }

  buildList() {
    this.model.encoding.label.data.spaceCatalog.then(spaceCatalog => {
      const catalog = [];
      const allCatalog = [];
      for (const dim in spaceCatalog) {
        if(this.parent.ui.primaryDim && dim !== this.parent.ui.primaryDim) continue;

        const filterSpec = this.model.encoding?.show?.data?.filter?.dimensions?.[dim] || {};
        const dimOr = this.model.data.filter.dimensions?.[dim]?.$or?.[0];
        const dimOrInEntityKeys = [];

        for (const key in dimOr) {
          if (key == dim) continue;
          if (dimOr[key].$in) {
            dimOr[key].$in.forEach(value => {
              dimOrInEntityKeys.push(this._getKey(value, key, dim));
            });
          }
        }

        if (spaceCatalog[dim].entities) {
          const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.find( f => f[dim])?.[dim]?.$in || [];
          const entities = [...spaceCatalog[dim].entities.filter(filterSpec).values()]
            .map(_d => {
              const d = utils.deepClone(_d);
              d.isness= Object.keys(d).filter(f => f.includes("is--") && d[f]).map(m => {              
                const concept = m.replace("is--","");
                return {
                  id: m,
                  name: this.model.data.source.getConcept(concept)?.name,
                  concept,
                  isProp: spaceCatalog[dim].properties.hasOwnProperty(concept)
                };
              });
              d[KEY] = _d[KEY];
              d.dim = dim;
              d.prop = dim;
              return d;
            });

          catalog.push(...entities.filter(f => {
            return !this.parent.dimMarkersData.has(f[Symbol.for("key")]) &&
              !dimOrIn.includes(f[Symbol.for("key")]);
          }));

          if(!this.parent.ui.disableAddRemoveGroups) allCatalog.push(...entities
            .reduce((result, entity) => {
              const props = entity.isness.filter(d => d.isProp);
              if (props.length) {
                props.forEach(prop => {
                  if (!dimOrInEntityKeys.includes(this._getKey(entity[KEY], prop.concept, dim))) {
                    result.push({
                      __allElements: true,
                      [KEY]: entity[KEY],
                      name: entity.name,
                      prop: prop.concept,
                      propName: prop.name,
                      dim
                    })
                  }
                })
              }
              return result;
            }, []));
        }
      }
      this.catalog = catalog;
      this.allCatalog = allCatalog;
      this.search();
    });
  }

  example() {
    const data = this.catalog;
    const randomItem = data[Math.floor(Math.random() * data.length)];
    return randomItem.name;
  }

  search(string = "") {
    if(string && string.length < 2) {
      this.DOM.matches.selectAll("li").remove();
      this.DOM.matches.classed("vzb-hidden", true);
      this.showHideHeader();
      return;
    }

    const matches = this.catalog.filter(f => f.name.toLowerCase().trim().includes(string.toLowerCase().trim()) || f[Symbol.for("key")].includes(string.toLowerCase().trim()))
      .sort((x, y) => d3.ascending(x.isness.map(k => k.id).join(), y.isness.map(k => k.id).join()))
      .concat(
        this.allCatalog.filter(f => f.name.toLowerCase().trim().includes(string.toLowerCase().trim()) || f[Symbol.for("key")].includes(string.toLowerCase().trim()))
          .sort((x, y) => d3.ascending(x.propName, y.propName))
      );
    
    this.DOM.matches.classed("vzb-hidden", !matches.length);
    this.DOM.matches.selectAll("li").remove();
    this.DOM.matches.selectAll("li")
      .data(matches)
      .enter().append("li")
      .html((d) => {
        if (d.__allElements) {
          return "ALL "
            + this.localise("marker-plural/" + this.model.id.replace("-splash", ""))
            + " where</br>"
            + d.propName + " = " + d.name;
        } else {
          return d.name + d.isness.map(m => `<span class="vzb-dialog-isness" style="background-color:${this.entitySetsColorScale(m.id)}">${m.name}</span>`).join("");
        }
      })
      .on("click", (event, d) => {
        const dimNin = this.model.data.filter.dimensions?.[d.dim]?.[d.prop]?.$nin || [];

        if (dimNin.includes(d[KEY])) {
          this.model.data.filter.deleteFromDimensionsFirstINstatement(d, [d.dim, d.prop, "$nin"]);
        } else {
          this.model.data.filter.addToDimensionsFirstINstatement(d, [d.dim, "$or", 0, d.prop, "$in"]);
        }

        this.concludeSearch();
      })
      .classed("vzb-dialog-all-entites", d => d.__allElements);

    this.showHideHeader(matches.length);
  }
}

const decorated = decorate(SectionAdd, {
});

export {decorated as SectionAdd};