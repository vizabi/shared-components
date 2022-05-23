import * as utils from "../../../legacy/base/utils";
import { BaseComponent } from "../../base-component";
import { runInAction } from "mobx";
import { toJS } from "mobx";

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
    const _this = this;
    if (this.parent._getPanelMode() !== "show") return;

    /*
    function addCategory(catalog, dim) {
      if (catalog.entities) {
        const filterSpec = _this.model.encoding.show?.data.filter.dimensions[dim];
        categories.push({
          dim,
          key: catalog.concept.concept,
          entities: catalog.entities.filter(filterSpec),
          name: catalog.concept.name
        });
      }
      if (catalog.properties) {
        Object.keys(catalog.properties).forEach(property => {
          addCategory(catalog.properties[property], dim);
        });
      }
    }
    */

    function getIsKeys(filter) {
      const matchedIs = [...JSON.stringify(filter).matchAll(/"(is--\w+)":true/g)];
      return matchedIs ? matchedIs.map(m => m[1]) : [];
    }

    const categories = [];
    this.model.data.spaceCatalog.then(spaceCatalog => {
      Object.keys(spaceCatalog).forEach(dim => {
        if (spaceCatalog[dim].entities) {
          const filter = toJS(_this.model.data.filter.dimensions[dim]);
          const df = spaceCatalog[dim].entities.filter(filter);

          const filterIsKeys = getIsKeys(filter);

          const rootCategory = { 
            dim, 
            key: dim,
            name: spaceCatalog[dim].concept.name,
            filterKey: null,
            entities: []
          };
          const categoryMap = new Map(Object.keys(spaceCatalog[dim].properties)
            .filter(key => key.includes("is--") && key.slice(4) !== dim)
            .map(isKey => {
              const key = isKey.replace("is--","");
              const isShown = filterIsKeys.includes(isKey);
              return [isKey, {
                dim,
                filterKey: isKey,
                key, 
                name: _this.model.data.source.getConcept(key).name,
                isShown,
                isShownOriginal: isShown,
                entities: []
              }];
            }));

          const isKeys = Array.from(categoryMap.keys());

          let setlessFlag = false;
          spaceCatalog[dim].entities.forEach((v,k) => {
            setlessFlag = true;
            isKeys.forEach(isKey => {
              if (v[isKey]) {
                const category = categoryMap.get(isKey);
                const isShown = df.hasByStr(v[Symbol.for("key")]);
                category.entities.push({
                  name: v.name,
                  dim,
                  setKey: category.key,
                  key: v[Symbol.for("key")],
                  filterKey: null,
                  isShown,
                  isShownOriginal: isShown,
                  category
                });
                setlessFlag = false;
              }
            });
            if (setlessFlag) rootCategory.entities.push({
              name: v.name,
              dim,
              setKey: dim,
              key: v[Symbol.for("key")],
              filterKey: null
            });
          });

          categoryMap.forEach(v => v.entities.length && rootCategory.entities.push(v));
          categories.push(rootCategory);
        }
        

        
        
        //addCategory(spaceCatalog[dim], dim);
      });
      

      this.categories = categories;
      this.buildList(categories);
    });
  }

  buildList(categories) {
    const _this = this;
    this.DOM.list.html("");

    const section = buildSection(this.DOM.list, categories);

    function buildSection(elem, categories) {
      return elem.selectAll(".vzb-accordion-section").data(categories)
        .enter().append("div")
          .attr("class", "vzb-accordion-section")
          .classed("vzb-accordion-active", d => _this.tabsConfig[d.key] === "open")
          .call(section => section.append("div")
            .attr("class", "vzb-accordion-section-title")
            .classed("vzb-dialog-checkbox", true)
            .on("click", function() {
              const parentEl = d3.select(this.parentNode);
              parentEl.classed("vzb-fullexpand", false)
                .classed("vzb-accordion-active", !parentEl.classed("vzb-accordion-active"));
            })
            .call(elem => elem.append("span")
              .attr("class", "vzb-show-category")
              .classed("vzb-show-category-set", d => d.entities && d.key !== d.dim)   
              .attr("title", function(d) {
                return this.offsetWidth < this.scrollWidth ? d.name : null;
              })
              .call(elem => {
                elem.append("input")
                  .attr("type", "checkbox")
                  .attr("class", "vzb-show-item")
                  .attr("id", d => "-show-" + (d.setKey ?? d.dim) + "-" + d.key + "-" + _this.id)
                  .property("checked",  d => d.isShown)
                  .on("change", (event, d) => {
                    if (d.isShown !== event.currentTarget.checked) {
                      d.isShown = event.currentTarget.checked;
                      section.selectAll(".vzb-show-item input")
                        .dispatch("change");
                    }
                  });
                elem.append("label")
                  .attr("for", d => "-show-" + (d.setKey ?? d.dim) + "-" + d.key + "-" + _this.id)
                  .text(d => d.dim === d.key ? "" : ".")
                elem.append("span")
                  .text(d => d.name)
                  .attr("title", function(d) {
                    return this.offsetWidth < this.scrollWidth ? d.name : null;
                  });
              })
            )
            // .call(elem => elem.append("span")
            //   .attr("class", "vzb-show-clear-cross")
            //   .text("✖")
            //   .on("click", (event) => {
            //     event.stopPropagation();
            //     elem.selectAll(".vzb-checked input")
            //       .property("checked", false)
            //       .dispatch("change");
            //   })
            // )
            // .call(elem => elem.append("span")
            //   .attr("class", "vzb-show-more vzb-dialog-button")
            //   .text(_this.localise("buttons/moreellipsis"))
            //   .on("click", (event) => {
            //     event.stopPropagation();
            //     elem.classed("vzb-fullexpand", true);
            //   })
            // )
          )
          .each(function(d) {
            const elem = d3.select(this);
            const list = elem.append("div")
            .attr("class", "vzb-show-category-list")
            .call(elem => {
              const items = elem.selectAll(".vzb-show-item")
                .data(d => d.entities)
                .enter()
                .append("div")
                .attr("class", "vzb-show-item")
                .classed("vzb-checked", d => d.isShown)
                .each(function(d) {
                  const item = d3.select(this);

                  if (d.entities) {
                    buildSection(item, [d]);
                    const filtered = item.selectAll(".vzb-filtered");
                    if (filtered.size()) {
                      item.classed("vzb-checked", true);
                    }
                    return;
                  }

                  item.classed("vzb-dialog-checkbox", true)
                    .append("input")
                    .attr("type", "checkbox")
                    .attr("class", "vzb-show-item")
                    .attr("id", d => "-show-" + (d.setKey ?? d.dim) + "-" + d.key + "-" + _this.id)
                    .property("checked",  d => d.isShown)
                    .on("change", (event, d) => {
                      if (d.isShown !== event.currentTarget.checked) {
                        d.isShown = event.currentTarget.checked;
                      } else {
                        d.isShown = d.category.isShown;
                        d3.select(event.currentTarget).property("checked", d.isShown)
                      };
                      if(d.isShown == d.isShownOriginal) {
                        delete _this.checkedDifference[d.dim + d.key];
                      } else {
                        _this.checkedDifference[d.dim + d.key] = true;
                      }

                      _this.DOM.apply.classed("vzb-disabled", !Object.keys(_this.checkedDifference).length);

                      // if (!this.previewShow[dim]) {
                      //   this.previewShow[dim] = {};
                      // }
                      // if (!this.previewShow[dim][key]) {
                      //   this.previewShow[dim][key] = [];
                      // }
                      // const index = this.previewShow[dim][key].indexOf(d[key]);
                      // index === -1 ? this.previewShow[dim][key].push(d[key]) : this.previewShow[dim][key].splice(index, 1);
                    });

                  item.append("label")
                    .attr("for", d => "-show-" + (d.setKey ?? d.dim) + "-" + d.key + "-" + _this.id)
                    .text(d => d.name)
                    .attr("title", function(d) {
                      return this.offsetWidth < this.scrollWidth ? d.name : null;
                    });
                })
            })

            const lastCheckedNode = list.selectAll(".vzb-checked")
              .classed("vzb-separator", false)
              .lower()
              .nodes()[0];
    
            if (lastCheckedNode && lastCheckedNode.nextSibling) {
              //const lastCheckedEl = d3.select(lastCheckedNode).classed("vzb-separator", !!lastCheckedNode.nextSibling);

              // const offsetTop = lastCheckedNode.parentNode.offsetTop + lastCheckedNode.offsetTop;
              // d3.select(lastCheckedNode.parentNode.parentNode).style("max-height", (offsetTop + lastCheckedNode.offsetHeight + 25) + "px")
              //   .select(".vzb-show-more").style("transform", `translate(0, ${offsetTop}px)`);
            } else {
              elem.select(".vzb-show-more").classed("vzb-hidden", true);
            }
    
            elem.classed("vzb-filtered", !!lastCheckedNode);
            elem.classed("vzb-fullexpand", !!lastCheckedNode && _this.tabsConfig[d["key"]] === "open fully");
    
            if (d.entities) {
              list.selectAll(".vzb-filtered").lower();
            }
          })

    }

  }

/*
  _buildList(categories) {
    const _this = this;
    this.DOM.list.html("");

    utils.forEach(categories, ({ dim, key, name, entities }) => {
      const isSet = dim !== key;
        
      entities = [...entities.values()]
        .map(d => Object.assign(d, {
          isShown: this._isMarkerInDimFilter(d, dim, key)
        }))
        //sort data alphabetically
        .sort((a, b) => (a.name < b.name) ? -1 : 1);
      
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
          .on("click", (event) => {
            event.stopPropagation();
            section.selectAll(".vzb-checked input")
              .property("checked", false)
              .dispatch("change");
          })
        )
        .call(elem => elem.append("span")
          .attr("class", "vzb-show-more vzb-dialog-button")
          .text(_this.localise("buttons/moreellipsis"))
          .on("click", (event) => {
            event.stopPropagation();
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
        .on("change", (event, d) => {
          if (d.isShown !== event.currentTarget.checked) {
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
*/

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
      showEquals = utils.comparePlainObjects(this.resetFilter[key] || {}, this.model.data.filter.dimensions[key] || {});
      return showEquals;
    });

    return showEquals;
  }

  _applyShowChanges() {
    runInAction(() => {
      const setObj = {};

      this.categories.forEach(c => {

      })




      // this.MDL.selected.data.filter.delete([...this.MDL.selected.data.filter.markers]);

      // const setObj = {};
      // utils.forEach(this.previewShow, (showObj, entities) => {
      //   const $and = {};
      //   const $andKeys = [];
      //   utils.forEach(showObj, (entitiesArray, category) => {
      //     $andKeys.push(category);
      //     if (entitiesArray.length) {
      //       $and[category] = { $in: entitiesArray.slice(0) };
      //     }
      //   });

      //   utils.forEach(this.model.data.filter.dimensions[entities], (filter, key) => {
      //     if (!$andKeys.includes(key)) {
      //       $and[key] = utils.deepClone(filter);
      //     }
      //   });

      //   setObj[entities] = $and;
      // });
      // this.model.data.filter.config.dimensions = setObj;
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
