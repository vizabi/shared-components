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

  setup(options) {
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
      label: this.model.encoding.get("label"),
      selected: this.model.encoding.get("selected"),
      frame: this.model.encoding.get("frame")
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

    const _this = this;

    const categories = [];
    const space = this.model.data.space.filter(dim => dim !== this.MDL.frame.data.concept);

    space.forEach(dim => {
      categories.push({ dim,
        key: dim,
        name: this.model.data.source.getConcept(dim).name
      });
        
    });

    // const entitySetData = entitiesModel.getEntitySets()
    //   .map(key => ({
    //     entities,
    //     key,
    //     dim,
    //     isSet: true,
    //     name: this.root.model.dataManager.getConceptProperty(key, "name")
    //   }));

    // categories.push(...entitySetData);
    this.DOM.list.html("");

    utils.forEach(categories, ({ dim, key, name, labelName, entities, isSet }) => {

      const data = isSet ?
        this.model.state[entities].getEntitySets("data")[key][0].map(d => {
          const result = { dim, category: key };
          result[key] = d[key];
          result["label"] = d.name;
          result["isShown"] = this._isMarkerInDimFilter(d, key);
          return result;
        })
        :
        this.MDL.label.data.response.find(elem => elem.dim == dim).data
          .map(d => {
            const result = { dim, category: key };
            result[key] = d[key];
            result.label = d.name;
            result.isShown = this._isMarkerInDimFilter(d, dim, key);
            return result;
          });

      //sort data alphabetically
      data.sort((a, b) => (a.label < b.label) ? -1 : 1);

      const section = this.DOM.list.append("div")
        .attr("class", "vzb-accordion-section")
        .classed("vzb-accordion-active", this.tabsConfig[key] === "open")
        .datum({ key, isSet });

      section.append("div")
        .attr("class", "vzb-accordion-section-title")
        .on("click", function(d) {
          const parentEl = d3.select(this.parentNode);
          parentEl.classed("vzb-fullexpand", false)
            .classed("vzb-accordion-active", !parentEl.classed("vzb-accordion-active"));
        })
        .call(elem => elem.append("span")
          .attr("class", "vzb-show-category")
          .classed("vzb-show-category-set", d => d.isSet)
          .text(name)
          .attr("title", function(d) {
            return this.offsetWidth < this.scrollWidth ? category : null;
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
        .data(data)
        .enter()
        .append("div")
        .attr("class", "vzb-show-item vzb-dialog-checkbox")
        .classed("vzb-checked", d => d.isShown);

      items.append("input")
        .attr("type", "checkbox")
        .attr("class", "vzb-show-item")
        .attr("id", d => "-show-" + d.category + "-" + d[key] + "-" + _this._id)
        .property("checked",  d => d.isShown)
        .on("change", (d, i, group) => {
          if (d.isShown !== group[i].checked) {
            this.checkedDifference[d.category + d[key]] = true;
          } else {
            delete this.checkedDifference[d.category + d[key]];
          }
          this.DOM.apply.classed("vzb-disabled", !Object.keys(this.checkedDifference).length);

          if (!this.previewShow[d.dim]) {
            this.previewShow[d.dim] = {};
          }
          if (!this.previewShow[d.dim][d.category]) {
            //const show = this.model.state[d.dim].show;
            this.previewShow[d.dim][d.category] = [];
          }
          const index = this.previewShow[d.dim][d.category].indexOf(d[d.category]);
          index === -1 ? this.previewShow[d.dim][d.category].push(d[d.category]) : this.previewShow[d.dim][d.category].splice(index, 1);
        });

      items.append("label")
        .attr("for", d => "-show-" + d.category + "-" + d[key] + "-" + _this._id)
        .text(d => d.label)
        .attr("title", function(d) {
          return this.offsetWidth < this.scrollWidth ? d.label : null;
        });

      const lastCheckedNode = list.selectAll(".vzb-checked")
        .classed("vzb-separator", false)
        .lower()
        .nodes()[0];

      if (lastCheckedNode && lastCheckedNode.nextSibling) {
        const lastCheckedEl = d3.select(lastCheckedNode).classed("vzb-separator", !!lastCheckedNode.nextSibling);
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
        const lower = (d.label || "").toString().toLowerCase();
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


const _Show = {

  init(config, parent) {
    this.name = "show";
    const _this = this;

    this.template = this.template || require("./show.html");

    this.model_expects = this.model_expects ||
    [{
      name: "state"
    }, {
      name: "locale",
      type: "locale"
    }];

    this.tabsConfig = ((config.ui.dialogs.dialog || {}).find || {}).showTabs || {};

    this._super(config, parent);
  },

  /**
   * Grab the list div
   */
  readyOnce() {
    this._super();

    this.KEYS = utils.unique(this.model.state.marker._getAllDimensions({ exceptType: "time" }));
    this.resetFilter = {};
    const spaceModels = this.model.state.marker._space;
    this.KEYS.forEach(key => {
      this.resetFilter[key] = utils.find(spaceModels, model => model.dim === key).show;
    });

    this.parentElement = d3.select(this.parent.element);
    this.contentEl = this.element = d3.select(this.element.parentNode);

    this.list = this.element.select(".vzb-show-list");
    this.input_search = this.parentElement.select(".vzb-find-search");
    this.deselect_all = this.parentElement.select(".vzb-show-deselect");
    this.apply = this.parentElement.select(".vzb-show-apply");

    const _this = this;

    this.deselect_all.on("click", () => {
      _this.resetShow();
    });

    this.apply.on("click", () => {
      _this.applyShowChanges();
    });

    //make sure it refreshes when all is reloaded
    this.root.on("ready", () => {
      _this.ready();
    });
  },

  ready() {
    this._super();
    this.KEYS = utils.unique(this.model.state.marker._getAllDimensions({ exceptType: "time" }));
    this.labelNames = this.model.state.marker.getLabelHookNames();
    const subHooks =  this.model.state.marker.getSubhooks(true);
    this.previewShow = {};
    this.checkedDifference = {};
    utils.forEach(this.labelNames, labelName => {
      const entities = subHooks[labelName].getEntity();
      const   showFilter = this.previewShow[entities._name] = {};
      utils.forEach(entities.show.$and || [entities.show], show$and => {
        utils.forEach(show$and, (filter, key) => {
          showFilter[key] = (filter.$in || []).slice(0);
        });
      });
    });
    this.redraw();
    this.showHideButtons();

    utils.preventAncestorScrolling(this.element.select(".vzb-dialog-scrollable"));

  },

  redraw() {

    const _this = this;
    this.translator = this.model.locale.getTFunction();

    this.model.state.marker.getFrame(this.model.state.time.value, values => {
      if (!values) return;

      const subHooks =  this.model.state.marker.getSubhooks(true);

      _this.list.html("");

      const categories = [];
      const loadPromises = [];
      utils.forEach(this.labelNames, (labelName, dim) => {
        const entitiesModel = subHooks[labelName].getEntity();
        const entities = entitiesModel._name;

        categories.push({ dim, entities, labelName,
          key: dim,
          category: this.root.model.dataManager.getConceptProperty(dim, "name")
        });

        const entitySetData = entitiesModel.getEntitySets()
          .map(key => ({
            entities,
            key,
            dim,
            isSet: true,
            category: this.root.model.dataManager.getConceptProperty(key, "name")
          }));

        categories.push(...entitySetData);
      });

      utils.forEach(categories, ({ dim, key, category, labelName, entities, isSet }) => {

        const data = isSet ?
          this.model.state[entities].getEntitySets("data")[key][0].map(d => {
            const result = { entities, category: key };
            result[key] = d[key];
            result["label"] = d.name;
            result["isShown"] = _this.model.state[entities].isInShowFilter(d, key);
            return result;
          })
          :
          utils.keys(values[labelName])
            .map(d => {
              const result = { entities, category: key };
              result[key] = d;
              result["label"] = values[labelName][d];
              result["isShown"] = _this.model.state[entities].isInShowFilter(result, key);
              return result;
            });

        //sort data alphabetically
        data.sort((a, b) => (a.label < b.label) ? -1 : 1);

        const section = _this.list.append("div")
          .attr("class", "vzb-accordion-section")
          .classed("vzb-accordion-active", this.tabsConfig[key] === "open")
          .datum({ key, isSet });

        section.append("div")
          .attr("class", "vzb-accordion-section-title")
          .on("click", function(d) {
            const parentEl = d3.select(this.parentNode);
            parentEl.classed("vzb-fullexpand", false)
              .classed("vzb-accordion-active", !parentEl.classed("vzb-accordion-active"));
          })
          .call(elem => elem.append("span")
            .attr("class", "vzb-show-category")
            .classed("vzb-show-category-set", d => d.isSet)
            .text(category)
            .attr("title", function(d) {
              return this.offsetWidth < this.scrollWidth ? category : null;
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
            .text(_this.translator("buttons/moreellipsis"))
            .on("click", () => {
              d3.event.stopPropagation();
              section.classed("vzb-fullexpand", true);
            })
          );

        const list = section.append("div")
          .attr("class", "vzb-show-category-list");

        const items = list.selectAll(".vzb-show-item")
          .data(data)
          .enter()
          .append("div")
          .attr("class", "vzb-show-item vzb-dialog-checkbox")
          .classed("vzb-checked", d => d.isShown);

        items.append("input")
          .attr("type", "checkbox")
          .attr("class", "vzb-show-item")
          .attr("id", d => "-show-" + d.category + "-" + d[key] + "-" + _this._id)
          .property("checked",  d => d.isShown)
          .on("change", (d, i, group) => {
            if (d.isShown !== group[i].checked) {
              this.checkedDifference[d.category + d[key]] = true;
            } else {
              delete this.checkedDifference[d.category + d[key]];
            }
            this.apply.classed("vzb-disabled", !Object.keys(this.checkedDifference).length);

            if (!this.previewShow[d.entities][d.category]) {
              const show = this.model.state[d.entities].show;
              this.previewShow[d.entities][d.category] = ((show[d.category] || ((show.$and || {})[d.category] || {})).$in || []).slice(0);
            }
            const index = this.previewShow[d.entities][d.category].indexOf(d[d.category]);
            index === -1 ? this.previewShow[d.entities][d.category].push(d[d.category]) : this.previewShow[d.entities][d.category].splice(index, 1);
          });

        items.append("label")
          .attr("for", d => "-show-" + d.category + "-" + d[key] + "-" + _this._id)
          .text(d => d.label)
          .attr("title", function(d) {
            return this.offsetWidth < this.scrollWidth ? d.label : null;
          });

        const lastCheckedNode = list.selectAll(".vzb-checked")
          .classed("vzb-separator", false)
          .lower()
          .nodes()[0];

        if (lastCheckedNode && lastCheckedNode.nextSibling) {
          const lastCheckedEl = d3.select(lastCheckedNode).classed("vzb-separator", !!lastCheckedNode.nextSibling);
          const offsetTop = lastCheckedNode.parentNode.offsetTop + lastCheckedNode.offsetTop;
          d3.select(lastCheckedNode.parentNode.parentNode).style("max-height", (offsetTop + lastCheckedNode.offsetHeight + 25) + "px")
            .select(".vzb-show-more").style("transform", `translate(0, ${offsetTop}px)`);
        } else {
          section.select(".vzb-show-more").classed("vzb-hidden", true);
        }

        section.classed("vzb-filtered", !!lastCheckedNode);
        section.classed("vzb-fullexpand", !!lastCheckedNode && this.tabsConfig[key] === "open");
      });

      _this.contentEl.node().scrollTop = 0;

      _this.input_search.attr("placeholder", _this.translator("placeholder/search") + "...");

    });
  },


  applyShowChanges() {
    this.model.state.marker.clearSelected();

    const setObj = {};
    utils.forEach(this.previewShow, (showObj, entities) => {
      const $and = [];
      const $andKeys = [];
      utils.forEach(showObj, (entitiesArray, category) => {
        $andKeys.push(category);
        if (entitiesArray.length) {
          $and.push({ [category]: { $in: entitiesArray.slice(0) } });
        }
      });

      utils.forEach(this.model.state[entities].show.$and || [this.model.state[entities].show], show$and => {
        utils.forEach(show$and, (filter, key) => {
          if (!$andKeys.includes(key)) {
            $and.push(utils.deepClone(filter));
          }
        });
      });

      setObj[entities] = { show: $and.length > 1 ? { $and } : ($and[0] || {}) };
    });
    this.model.state.set(setObj);
  },

  showHideSearch() {
    if (this.parent.getPanelMode() !== "show") return;

    let search = this.input_search.node().value || "";
    search = search.toLowerCase();
    this.list.selectAll(".vzb-show-item")
      .classed("vzb-hidden", d => {
        const lower = (d.label || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });

    if (search !== "") {
      this.list.selectAll(".vzb-accordion-section")
        .classed("vzb-accordion-active", true);
    }
  },

  showHideButtons() {
    if (this.parent.getPanelMode() !== "show") return;

    this.deselect_all.classed("vzb-hidden", this.hideResetButton());
    //
    this.apply.classed("vzb-hidden", false)
      .classed("vzb-disabled", true);
  },

  hideResetButton() {
    let showEquals = true;
    const spaceModels = this.model.state.marker._space;
    utils.forEach(this.KEYS, key => {
      showEquals = utils.comparePlainObjects(this.resetFilter[key] || {}, utils.find(spaceModels, model => model.dim === key).show);
      return showEquals;
    });

    return showEquals;
  },

  resetShow() {
    const setProps = {};
    const spaceModels = this.model.state.marker._space;
    this.KEYS.forEach(key => {
      const entities = utils.find(spaceModels, model => model.dim === key)._name;
      setProps[entities] = { show: this.resetFilter[key] || {} };
    });
    this.model.state.set(setProps);
  },

  closeClick() {
    this.applyShowChanges();
  }

}
