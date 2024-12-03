import { MarkerControlsSection } from "./section.js";
import { decorate } from "mobx";
import * as d3 from "d3";

const KEY = Symbol.for("key");

class SectionRemove extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.matches = this.DOM.content.append("ul").attr("class", "vzb-remove-matches");

    this.catalog = [];
    this.allCatalog = [];
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.addReaction(this.createList);

  }

  updateSearch(text = "") {
    this.search(text);
  }

  concludeSearch(text = "") {
    this.search(text);
  }

  _getKey(element, key, dim) {
    return dim + "¬" + key + "¬" + element;
  }

  createList() {
    this.DOM.title.text(this.localise("markercontrols/section/remove"));
    this.model.encoding.label.data.spaceCatalog.then(spaceCatalog => {
      const dataKeys = [...this.parent.dimMarkersData.keys()];
      const markersFromIn = [];

      for (const dim in spaceCatalog) {
        const dimOrIn = this.model.data.filter.dimensions?.[dim]?.$or?.find( f => f[dim])?.[dim]?.$in || [];
        markersFromIn.push(...dimOrIn
          .filter(d => !dataKeys.includes(d))
          .map(d => {
            if (spaceCatalog[dim].entities && spaceCatalog[dim].entities.has(d)) {
              const entity = spaceCatalog[dim].entities.get(d);
              return ({
                [KEY]: entity[KEY],
                [dim]: entity[dim],
                name: entity.name,
                prop: dim,
                dim
              });
            }
            return ({
              [KEY]: d,
              [dim]: dim,
              name: d,
              prop: dim,
              dim
            });
          })
        );
      }

      this.catalog = [...this.parent.dimMarkersData.values(), ...markersFromIn];

      const allCatalog = [];
      for (const dim in spaceCatalog) {
        const dimFilter = this.model.data.filter.dimensions?.[dim] || {};
        const dimNinEntities = [];
        for (const key in dimFilter) {
          if (key == dim) continue;
          if (dimFilter[key].$nin) {
            dimFilter[key].$nin.forEach(element => {
              dimNinEntities.push(this._getKey(element, key, dim));
            });
          }
        }
        const dimProps = spaceCatalog[dim].properties;
        if (dimProps) {
          for (const prop in dimProps) {
            if (dimProps[prop]?.concept?.concept_type == "entity_set") {
              dimProps[prop].entities.forEach((entityObj, key) => {
                if (!dimNinEntities.includes(this._getKey(key, prop, dim))) {
                  allCatalog.push({
                    __allElements: true,
                    [KEY]: key,
                    [dim]: prop,
                    name: entityObj.name,
                    prop,
                    propName: dimProps[prop].concept.name,
                    dim
                  });
                }
              });
            }
          }
        }
      }

      if(!this.parent.ui.disableAddRemoveGroups) this.allCatalog = allCatalog;
      this.search();
    });

  }

  search(string = ""){
    if(string && string.length < 2) {
      this.DOM.matches.selectAll("li").remove();
      this.DOM.matches.classed("vzb-hidden", true);
      this.showHideHeader();
      return;
    }

    const matches = this.catalog.filter(f => f.name.toLowerCase().trim().includes(string.toLowerCase().trim()) || f[Symbol.for("key")].includes(string.toLowerCase().trim()))
      .sort((x, y) => d3.ascending(x.name, y.name))
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
          return d.name;
        }
      })
      .on("click", (event, d) => {
        this.model.data.filter.deleteUsingLimitedStructure({key: d[KEY], dim: d.dim, prop: d.prop});
        this.concludeSearch();
      })
      .classed("vzb-dialog-all-entites", d => d.__allElements);

    this.showHideHeader(matches.length);
  }
}

const decorated = decorate(SectionRemove, {
});

export {decorated as SectionRemove};