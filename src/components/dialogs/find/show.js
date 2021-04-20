import * as utils from "../../../legacy/base/utils";
import { BaseComponent } from "../../base-component";
import { runInAction } from "mobx";

/*!
 * VIZABI SHOW PANEL CONTROL
 * Reusable show panel dialog
 */

export class Show extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class="vzb-show-list vzb-accordion">
        <!-- list will be placed here -->
      </div>
    `;

    super(config);
  }

  setup() {
    this.DOM = {};
    this.DOM.list = this.element.select(".vzb-show-list");
    this.DOM.input_search = this.parent.element.select(".vzb-find-search");
    this.DOM.deselect_all = this.parent.element.select(".vzb-show-deselect");
    this.DOM.apply = this.parent.element.select(".vzb-show-apply");
  
    this.DOM.deselect_all.on("click", () => {
      this._resetShow();
    });

    this.DOM.apply.on("click", () => {
      this._applyShowChanges();
    });

    this.tabsConfig = this.ui.showTabs || {};
  }

  draw() {
    this.MDL = {
      selected: this.model.encoding.selected,
      frame: this.model.encoding.frame
    };

    this.localise = this.services.locale.auto();

    this.previewShow = {};
    const dimensionFilter = this.model.data.filter.dimensions;
    if (!this.resetFilter) this.resetFilter = utils.deepClone(dimensionFilter);
    utils.forEach(this.model.data.space, dim => {
      if (dimensionFilter[dim]) {
        this.previewShow[dim] = utils.deepExtend({}, dimensionFilter[dim]);
        utils.forEach(dimensionFilter[dim].$and || [dimensionFilter[dim]], filter$and => {
          utils.forEach(filter$and, (filter, key) => {
            this.previewShow[dim][key] = (filter.$in || []).slice(0);
          });
        });
      }
    });

    this.checkedDifference = {};

    this.addReaction(this._updateView);
  }

  _updateView() {
    if (this.parent._getPanelMode() !== "show") return;

    
    function addCategory(catalog, dim) {
      if (catalog.entities) {
        categories.push({
          dim,
          key: catalog.concept.concept,
          entities: catalog.entities,
          name: catalog.concept.name
        });
      }
      if (catalog.properties) {
        Object.keys(catalog.properties).forEach(property => {
          addCategory(catalog.properties[property], dim);
        });
      }
    }
    
    const categories = [];
    this.model.data.spaceCatalog.then(spaceCatalog => {
      Object.keys(spaceCatalog).forEach(dim => {
        addCategory(spaceCatalog[dim], dim);
      });
      this.buildList(categories);
    });
  }

  buildList(categories) {
    const _this = this;
    this.DOM.list.html("");

    utils.forEach(categories, ({ dim, key, name, entities }) => {
      const isSet = dim !== key;
        
      entities = entities
        .map(d => Object.assign(d, {
          isShown: this._isMarkerInDimFilter(d, dim, key)
        }))
        //sort data alphabetically
        .sort((a, b) => (a.name < b.name) ? -1 : 1)
    
      //TODO: HACK remove this UN state filter when we will be able to request entity properties separately
      if (this.model.encoding.unstate){
        const unstateData = this.model.encoding.unstate.data.response[0].data;
        const unstateDim = this.model.encoding.unstate.data.space[0];
        entities = entities
          .filter(f => unstateDim !== key || unstateData.find(d => d[key] == f[key]).un_state);
      }

      const section = this.DOM.list.append("div")
        .attr("class", "vzb-accordion-section")
        .classed("vzb-accordion-active", this.tabsConfig[key] === "open")
        .datum({ key, isSet });

      section.append("div")
        .attr("class", "vzb-accordion-section-title")
        .on("click", function() {
          const parentEl = d3.select(this.parentNode);
          parentEl.classed("vzb-fullexpand", false)
            .classed("vzb-accordion-active", !parentEl.classed("vzb-accordion-active"));
        })
        .call(elem => elem.append("span")
          .attr("class", "vzb-show-category")
          .classed("vzb-show-category-set", d => d.isSet)
          .text(name)
          .attr("title", function() {
            return this.offsetWidth < this.scrollWidth ? name : null;
          })
        )
        .call(elem => elem.append("span")
          .attr("class", "vzb-show-clear-cross")
          .text("✖")
          .on("click", () => {
            d3.event.stopPropagation();
            section.selectAll(".vzb-checked input")
              .property("checked", false)
              .dispatch("change");
          })
        )
        .call(elem => elem.append("span")
          .attr("class", "vzb-show-more vzb-dialog-button")
          .text(_this.localise("buttons/moreellipsis"))
          .on("click", () => {
            d3.event.stopPropagation();
            section.classed("vzb-fullexpand", true);
          })
        );

      const list = section.append("div")
        .attr("class", "vzb-show-category-list");

      const items = list.selectAll(".vzb-show-item")
        .data(entities)
        .enter()
        .append("div")
        .attr("class", "vzb-show-item vzb-dialog-checkbox")
        .classed("vzb-checked", d => d.isShown);

      items.append("input")
        .attr("type", "checkbox")
        .attr("class", "vzb-show-item")
        .attr("id", d => "-show-" + key + "-" + d[key] + "-" + _this.id)
        .property("checked",  d => d.isShown)
        .on("change", (d, i, group) => {
          if (d.isShown !== group[i].checked) {
            this.checkedDifference[key + d[key]] = true;
          } else {
            delete this.checkedDifference[key + d[key]];
          }
          this.DOM.apply.classed("vzb-disabled", !Object.keys(this.checkedDifference).length);

          if (!this.previewShow[dim]) {
            this.previewShow[dim] = {};
          }
          if (!this.previewShow[dim][key]) {
            this.previewShow[dim][key] = [];
          }
          const index = this.previewShow[dim][key].indexOf(d[key]);
          index === -1 ? this.previewShow[dim][key].push(d[key]) : this.previewShow[dim][key].splice(index, 1);
        });

      items.append("label")
        .attr("for", d => "-show-" + key + "-" + d[key] + "-" + _this.id)
        .text(d => d.name)
        .attr("title", function(d) {
          return this.offsetWidth < this.scrollWidth ? d.name : null;
        });

      const lastCheckedNode = list.selectAll(".vzb-checked")
        .classed("vzb-separator", false)
        .lower()
        .nodes()[0];

      if (lastCheckedNode && lastCheckedNode.nextSibling) {
        //const lastCheckedEl = d3.select(lastCheckedNode).classed("vzb-separator", !!lastCheckedNode.nextSibling);
        const offsetTop = lastCheckedNode.parentNode.offsetTop + lastCheckedNode.offsetTop;
        d3.select(lastCheckedNode.parentNode.parentNode).style("max-height", (offsetTop + lastCheckedNode.offsetHeight + 25) + "px")
          .select(".vzb-show-more").style("transform", `translate(0, ${offsetTop}px)`);
      } else {
        section.select(".vzb-show-more").classed("vzb-hidden", true);
      }

      section.classed("vzb-filtered", !!lastCheckedNode);
      section.classed("vzb-fullexpand", !!lastCheckedNode && this.tabsConfig[key] === "open fully");
    });

    //_this.DOM.content.node().scrollTop = 0;

  }

  _showHideSearch() {
    if (this.parent._getPanelMode() !== "show") return;

    let search = this.DOM.input_search.node().value || "";
    search = search.toLowerCase();
    this.DOM.list.selectAll(".vzb-show-item")
      .classed("vzb-hidden", d => {
        const lower = (d.name || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });

    if (search !== "") {
      this.DOM.list.selectAll(".vzb-accordion-section")
        .classed("vzb-accordion-active", true);
    }
  }

  _showHideButtons() {
    if (this.parent._getPanelMode() !== "show") return;

    this.DOM.deselect_all.classed("vzb-hidden", this._hideResetButton());
    //
    this.DOM.apply.classed("vzb-hidden", false)
      .classed("vzb-disabled", true);
  }

  _hideResetButton() {
    let showEquals = true;
    const space = this.model.data.space;
    utils.forEach(space, key => {
      showEquals = utils.comparePlainObjects(this.resetFilter[key] || {}, this.model.data.filter.dimensions[key]);
      return showEquals;
    });

    return showEquals;
  }

  _applyShowChanges() {
    runInAction(() => {
      this.MDL.selected.data.filter.delete([...this.MDL.selected.data.filter.markers]);

      const setObj = {};
      utils.forEach(this.previewShow, (showObj, entities) => {
        const $and = {};
        const $andKeys = [];
        utils.forEach(showObj, (entitiesArray, category) => {
          $andKeys.push(category);
          if (entitiesArray.length) {
            $and[category] = { $in: entitiesArray.slice(0) };
          }
        });

        utils.forEach(this.model.data.filter.dimensions[entities], (filter, key) => {
          if (!$andKeys.includes(key)) {
            $and[key] = utils.deepClone(filter);
          }
        });

        setObj[entities] = $and;
      });
      this.model.data.filter.config.dimensions = setObj;
    });
  }

  _resetShow() {
    runInAction(() => {
      this.model.data.filter.config.dimensions = this.resetFilter;
    });
  }

  _closeClick() {
    this._applyShowChanges();
  }

  _isMarkerInDimFilter(d, dim, key) {
    const dimensionFilter = this.model.data.filter.dimensions[dim] || {};

    return utils.getProp(dimensionFilter, [key, "$in"], []).includes(d[key]);
  }

}
