import { BaseComponent } from "../base-component.js";
import { STATUS } from "../../utils.js";
import { Menu } from "./menu";
import { OPTIONS, css, MENU_HORIZONTAL, MENU_VERTICAL } from "./config";
import * as utils from "../../legacy/base/utils";
import { ICON_CLOSE as iconClose } from "../../icons/iconset";
import "./treemenu.scss";
import {runInAction} from "mobx";
import * as d3 from "d3";

const PROFILE_CONSTANTS = {
  SMALL: {
    col_width: 200
  },
  MEDIUM: {
    col_width: 200
  },
  LARGE: {
    col_width: 200
  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    col_width: 200
  },
  LARGE: {
    col_width: 200
  }
};

function getTagNameForDs(ds){
  return "dataset " + ds.id;
}

function getItemName(item){
  if (item.type == "indicator"){
    return item.byDataSources.map(m => m.name_catalog)
      .concat(item.byDataSources.map(m => m.name))
      .concat(item.id)
      .filter(f => f)
      [0]
  } else {
    return item.name_catalog || item.name || item.id;
  }
}


function resolveDefaultScales(concept) {
  if (concept.scales) return JSON.parse(concept.scales);
  switch (concept.concept_type) {
  case "measure": return ["linear", "log"];
  case "string": return ["ordinal"];
  case "entity_domain": return ["ordinal"];
  case "entity_set": return ["ordinal"];
  case "boolean": return ["ordinal"];
  case "time": return ["time"];
  default: return ["linear", "log"];
  }
}

function spacesAreEqual(a, b){
  return a.concat().sort().join() === b.concat().sort().join();
}

/*!
 * VIZABI TREEMENU
 * Treemenu component
 */

export class TreeMenu extends BaseComponent {

  constructor(config) {
    //contructor is the same as any component
    super(config);
  }

  //setters-getters
  indicatorsTree(input) {
    if (!arguments.length) return this._indicatorsTree;
    this._indicatorsTree = input;
    return this;
  }
  callback(input) {
    if (!arguments.length) return this._callback;
    this._callback = input;
    return this;
  }
  encoding(input) {
    if (!arguments.length) return this._encoding;
    this._encoding = input;
    this.targetModel(this.model.encoding[this._encoding]);
    return this;
  }
  showWhenReady(input) {
    if (!arguments.length) return this._showWhenReady;
    this._showWhenReady = input;
    return this;
  }
  scaletypeSelectorDisabled(input) {
    if (!arguments.length) return this._scaletypeSelectorDisabled;
    this._scaletypeSelectorDisabled = input;
    return this;
  }
  title(input) {
    if (!arguments.length) return this._title;
    this._title = input;
    return this;
  }

  alignX(input) {
    if (!arguments.length) return this._alignX;
    this._alignX = input;
    return this;
  }
  alignY(input) {
    if (!arguments.length) return this._alignY;
    this._alignY = input;
    return this;
  }
  top(input) {
    if (!arguments.length) return this._top;
    this._top = input;
    return this;
  }
  left(input) {
    if (!arguments.length) return this._left;
    this._left = input;
    return this;
  }

  targetModel(input) {
    if (!arguments.length) return this._targetModel;

    this.removeReaction(this._targetModelReaction);
    this._targetModel = input;
    this._targetProp = null;
    this._targetProp = ["data", "concept"];
    this.addReaction(this._targetModelReaction);

    return this;
  }

  targetProp(input) {
    if (!arguments.length) return this._targetProp;
    this._targetProp = input;
    return this;
  }

  _targetModelReaction() {
    utils.getProp(this._targetModel, ["scale", "type"]);
    utils.getProp(this._targetModel, this._targetProp);
    this.updateView();
  }

  _buildTagFolderTree({ tagsArray, dataModels }) {
    if (tagsArray === true || !tagsArray) tagsArray = [];

    const ROOT = "_root";
    const ADVANCED = "advanced";
    const OTHER_DATASETS = "other_datasets";

    const FOLDER_STRATEGY_SPREAD = "spread"; //spread indicatos over the root of treemeny
    const FOLDER_STRATEGY_ROOT = "root"; //put indicators in dataset's own folder under root of treemeny
    const FOLDER_STRATEGY_FOLDER = "folder"; //put indicators in dataset's own folder inside a specified folder. use notation like "folder:other_datasets"

    //const dataModels = _this.model.marker._root.dataManager.getDataModels();
    const FOLDER_STRATEGY_DEFAULT = dataModels.length == 1 ? FOLDER_STRATEGY_SPREAD : FOLDER_STRATEGY_ROOT;

    //init the dictionary of tags and add default folders
    const tags = {};
    tags[ROOT] = { id: ROOT, children: [] };
    tags[ADVANCED] = { id: ADVANCED, name: this.localise("treemenu/advanced"), type: "folder", children: [] };
    tags[ROOT].children.push(tags[ADVANCED]);
    tags[OTHER_DATASETS] = { id: OTHER_DATASETS, name: this.localise("treemenu/other_datasets"), type: "folder", children: [] };
    tags[ROOT].children.push(tags[OTHER_DATASETS]);

    //populate the dictionary of tags
    tagsArray.forEach(tag => { tags[tag.tag] = { id: tag.tag, name: tag.name, type: "folder", children: [] }; });

    //put the dataset folders where they should be: either in root or in specific folders or ==root in case of spreading
    const folderStrategies = {};
    dataModels.forEach((ds) => {
      //special ds tag id is needed to prevent a situation when DS id happens to be equal to ID of one of the tags
      const dsTag = getTagNameForDs(ds);

      //figure out the folder strategy
      let strategy = utils.getProp(this.ui, ["folderStrategyByDataset", ds.id]);
      let folder = null;
      if (!strategy) strategy = FOLDER_STRATEGY_DEFAULT;

      if (strategy.includes(":")) {
        folder = strategy.split(":")[1];
        strategy = strategy.split(":")[0];
      }

      //add the dataset's folder to the tree
      tags[dsTag] = { id: ds.id, name: this._getDatasetName(ds), type: "dataset", children: [] };

      if (strategy == FOLDER_STRATEGY_FOLDER && tags[folder]) {
        tags[folder].children.push(tags[dsTag]);
      } else if (strategy == FOLDER_STRATEGY_SPREAD) {
        tags[dsTag] = tags[ROOT];
      } else {
        tags[ROOT].children.push(tags[dsTag]);
      }

      folderStrategies[ds.id] = strategy;
    });

    //populate the tag tree
    tagsArray.forEach(tag => {

      //if tag's parent is defined
      if (tag.parent && tags[tag.parent]) {

        //add tag to a branch
        tags[tag.parent].children.push(tags[tag.tag]);

      } else {

        //if parent is missing add a tag either to dataset's own folder or to the root if spreading them
        if (folderStrategies[tag.datasource.id] == FOLDER_STRATEGY_SPREAD) {
          tags[ROOT].children.push(tags[tag.tag]);
        } else {
          if (tags[getTagNameForDs(tag.datasource)])
            tags[getTagNameForDs(tag.datasource)].children.push(tags[tag.tag]);
          else
            utils.warn(`Tags request to the datasource ${tag.datasource.id} probably didn't succeed`);
        }
      }
    });

    return {tags, tagsRoot: tags[ROOT]};
  }

  _addIndicatorToTheTree(id, item, folder) {
    const existing = folder.children.find(f => f.id == id);
    if (existing) {
      //add to an existing item group
      existing.byDataSources.push(item);
    } else {
      //create a new item group
      folder.children.push({ id: id, type: "indicator", byDataSources: [item] });
    }
    return folder;
  }

  _buildIndicatorsTree({ tagsArray, dataModels }) {

    let consoleGroupOpen = false;
    const {tags, tagsRoot} = this._buildTagFolderTree({ tagsArray, dataModels });

    //add constant pseudoconcept
    this._addIndicatorToTheTree("_default", { spaces: [[]] }, tagsRoot);

    const nest = this._nestAvailabilityByConcepts(this._getAvailability());
    const filtervl = this._conceptsCompatibleWithMarkerSpace(nest, this.model.data.space);
    const concepts = this._convertConceptMapToArray(filtervl);

    concepts
      //add marker space concepts to be able to select "color by countries" or "x by time"
      .concat(this.model.data.space.map(d => {
        return { 
          spaces: [[d]],
          source: this.model.data.source,
          concept: this.model.data.source.getConcept(d)
        }; 
      }))
      .filter(f => !f.concept.tags || f.concept.tags !== "_none")
      .forEach(({concept, spaces, source}) => {

        const id = concept.concept;
        const props = {
          dataSource: source,
          spaces,
          name: concept.name,
          name_catalog: concept.name_catalog,
          description: concept.description
        };

        if (concept.concept_type == "time" || concept.concept == "_default"){
          //special concepts
          this._addIndicatorToTheTree(id, props, tagsRoot);

        } else if (concept.concept_type == "entity_domain" || concept.concept_type == "entity_set") {
          //entity sets and domains
          const keyConcept = source.getConcept(spaces[0][0]);
          const folderName = keyConcept.concept + "_properties";
          if (!tags[folderName]) {
            tags[folderName] = { id: folderName, name: keyConcept.name + " properties", type: "folder", children: [] };
            tagsRoot.children.push(tags[folderName]);
          }
          this._addIndicatorToTheTree(id, props, tags[folderName]);

        } else {
          //regulat indicators
          const conceptTags = concept.tags || getTagNameForDs(source) || "_root";
          conceptTags.split(",").forEach(tag => {
            tag = tag.trim();
            if (tags[tag]) {
              this._addIndicatorToTheTree(id, props, tags[tag]);
            } else {
              //if entry's tag is not found in the tag dictionary
              if (!consoleGroupOpen) {
                console.groupCollapsed("Some tags were not found, so indicators went under menu root");
                consoleGroupOpen = true;
              }
              utils.warn("tag '" + tag + "' for indicator '" + props.id + "'");
              this._addIndicatorToTheTree(id, props, tagsRoot);
            }
          });

        }
      });


    if (consoleGroupOpen) console.groupEnd();
    this._sortChildren(tagsRoot);
    this.indicatorsTree(tagsRoot);

    return Promise.resolve();
  }

  _sortChildren(tree, isSubfolder) {
    const _this = this;
    if (!tree.children) return;
    tree.children.sort(
      utils
      //in each folder including root: put subfolders below loose items
        .firstBy()((a, b) => { a = a.type === "dataset" ? 1 : 0;  b = b.type === "dataset" ? 1 : 0; return b - a; })
        .thenBy((a, b) => { a = a.children ? 1 : 0;  b = b.children ? 1 : 0; return a - b; })
        .thenBy((a, b) => {
        //in the root level put "time" on top and send "anvanced" to the bottom
          if (!isSubfolder) {
            if (a.id == "time") return -1;
            if (b.id == "time") return 1;
            if (a.id == "other_datasets") return 1;
            if (b.id == "other_datasets") return -1;
            if (a.id == "advanced") return 1;
            if (b.id == "advanced") return -1;
            if (a.id == "_default") return 1;
            if (b.id == "_default") return -1;
          }
          //sort items alphabetically. folders go down because of the emoji folder in the beginning of the name
          return getItemName(a) > getItemName(b) ? 1 : -1;
        })
    );

    //recursively sort items in subfolders too
    tree.children.forEach(d => {
      _this._sortChildren(d, true);
    });
  }

  //happens on resizing of the container
  _resize() {
    this.services.layout.size;
    
    const _this = this;
    const { wrapper, wrapperOuter } = this.DOM;

    let top = this._top;
    let left = this._left;

    if (!wrapper) return utils.warn("treemenu resize() abort because container is undefined");

    wrapper.classed(css.noTransition, true);
    wrapper.node().scrollTop = 0;

    this.OPTIONS.IS_MOBILE = this.services.layout.profile === "SMALL";

    if (this.menuEntity) {
      this.menuEntity.setWidth(this.profileConstants.col_width, true, true);

      if (this.OPTIONS.IS_MOBILE) {
        if (this.menuEntity.direction != MENU_VERTICAL) {
          this.menuEntity.setDirection(MENU_VERTICAL, true);
          this.OPTIONS.MENU_DIRECTION = MENU_VERTICAL;
        }
      } else {
        if (this.menuEntity.direction != MENU_HORIZONTAL) {
          this.menuEntity.setDirection(MENU_HORIZONTAL, true);
          this.OPTIONS.MENU_DIRECTION = MENU_HORIZONTAL;
        }
      }
    }

    this.width = _this.element.node().offsetWidth;
    this.height = _this.element.node().offsetHeight;
    const rect = wrapperOuter.node().getBoundingClientRect();
    const containerWidth = rect.width;
    let containerHeight = rect.height;
    if (containerWidth) {
      if (this.OPTIONS.IS_MOBILE) {
        this.clearPos();
      } else {
        if (top || left) {
          if (wrapperOuter.node().offsetTop < 10) {
            wrapperOuter.style("top", "10px");
          }
          if (this.height - wrapperOuter.node().offsetTop - containerHeight < 0) {
            if (containerHeight > this.height) {
              containerHeight = this.height - 20;
            }
            wrapperOuter.style("top", (this.height - containerHeight - 10) + "px");
            wrapperOuter.style("bottom", "auto");
          }
          if (top) top = wrapperOuter.node().offsetTop;
        }

        let maxHeight;
        if (wrapperOuter.classed(css.alignYb)) {
          maxHeight = wrapperOuter.node().offsetTop + wrapperOuter.node().offsetHeight;
        } else {
          maxHeight = this.height - wrapperOuter.node().offsetTop;
        }
        wrapper.style("max-height", (maxHeight - wrapper.node().offsetTop - 10) + "px");

        wrapperOuter.classed(css.alignXc, this._alignX === "center");
        wrapperOuter.style("margin-left", this._alignX === "center" ? "-" + containerWidth / 2 + "px" : null);
        if (this._alignX === "center") {
          this.OPTIONS.MAX_MENU_WIDTH = this.width / 2 - containerWidth * 0.5 - 10;
        } else {
          this.OPTIONS.MAX_MENU_WIDTH = this.width - wrapperOuter.node().offsetLeft - containerWidth - 10; // 10 - padding around wrapper
        }

        const minMenuWidth = this.profileConstants.col_width + this.OPTIONS.MIN_COL_WIDTH * 2;
        let leftPos = wrapperOuter.node().offsetLeft;
        this.OPTIONS.MENU_OPEN_LEFTSIDE = this.OPTIONS.MAX_MENU_WIDTH < minMenuWidth && leftPos > (this.OPTIONS.MAX_MENU_WIDTH + 10);
        if (this.OPTIONS.MENU_OPEN_LEFTSIDE) {
          if (leftPos <  (minMenuWidth + 10)) leftPos = (minMenuWidth + 10);
          this.OPTIONS.MAX_MENU_WIDTH = leftPos - 10; // 10 - padding around wrapper
        } else {
          if (this.OPTIONS.MAX_MENU_WIDTH < minMenuWidth) {
            leftPos -= (minMenuWidth - this.OPTIONS.MAX_MENU_WIDTH);
            this.OPTIONS.MAX_MENU_WIDTH = minMenuWidth;
          }
        }

        if (left) {
          left = leftPos;
        } else {
          if (leftPos != wrapperOuter.node().offsetLeft) {
            wrapperOuter.style("left", "auto");
            wrapperOuter.style("right", (this.width - leftPos - rect.width) + "px");
          }
        }

        this._top = top;
        this._left = left;

        if (left || top) this.setPos();

        wrapperOuter.classed("vzb-treemenu-open-left-side", !this.OPTIONS.IS_MOBILE && this.OPTIONS.MENU_OPEN_LEFTSIDE);
      }
    }

    wrapper.node().offsetHeight;
    wrapper.classed(css.noTransition, false);

    this._setHorizontalMenuHeight();

    return this;
  }

  toggle() {
    this.setHiddenOrVisible(!this.element.classed(css.hidden));
  }

  setHiddenOrVisible(hidden) {
    const _this = this;

    this.element.classed(css.hidden, hidden);
    this.DOM.wrapper.classed(css.noTransition, hidden);

    if (hidden) {
      this.clearPos();
      this.menuEntity.marqueeToggle(false);
    } else {
      this.setPos();
      !utils.isTouchDevice() && this._focusSearch();
      this._resize();
      this._scrollToSelected();
    }

    this.root.children.forEach(c => {
      if (c.name == "gapminder-dialogs") {
        d3.select(c.placeholder.parentNode).classed("vzb-blur", !hidden);
      } else
      if (c.element.classed) {
        c.element.classed("vzb-blur", c != _this && !hidden);
      } else {
        d3.select(c.element).classed("vzb-blur", c != _this && !hidden);
      }
    });

    this.width = _this.element.node().offsetWidth;

    return this;
  }

  _scrollToSelected() {
    if (!this.selectedNode) return;
    const _this = this;

    if (this.menuEntity.direction == MENU_VERTICAL) {
      scrollToItem(this.DOM.wrapper.node(), this.selectedNode);
      _this.menuEntity.marqueeToggleAll(true);
    } else {
      const selectedItem = this.menuEntity.findItemById(d3.select(this.selectedNode).datum().id);
      selectedItem.submenu.calculateMissingWidth(0, () => {
        _this.menuEntity.marqueeToggleAll(true);
      });

      let parent = this.selectedNode;
      let listNode;
      while (!(utils.hasClass(parent, css.list_top_level))) {
        if (parent.tagName == "LI") {
          listNode = utils.hasClass(parent.parentNode, css.list_top_level) ? parent.parentNode.parentNode : parent.parentNode;
          scrollToItem(listNode, parent);
        }
        parent = parent.parentNode;
      }
    }

    function scrollToItem(listNode, itemNode){
      listNode.scrollTop = 0;
      const rect = listNode.getBoundingClientRect();
      const itemRect = itemNode.getBoundingClientRect();
      const scrollTop = itemRect.bottom - rect.top - listNode.offsetHeight + 10;
      listNode.scrollTop = scrollTop;
    }
  }

  setPos() {
    const { wrapperOuter } = this.DOM;

    const top = this._top;
    const left = this._left;
    const rect = wrapperOuter.node().getBoundingClientRect();

    if (top) {
      wrapperOuter.style("top", top + "px");
      wrapperOuter.style("bottom", "auto");
      wrapperOuter.classed(css.absPosVert, top);
    }
    if (left) {
      let right = this.element.node().offsetWidth - left - rect.width;
      right = right < 10 ? 10 : right;
      wrapperOuter.style("right", right + "px");
      wrapperOuter.style("left", "auto");
      wrapperOuter.classed(css.absPosHoriz, right);
    }

  }

  clearPos() {
    const { wrapper, wrapperOuter } = this.DOM;

    this._top = "";
    this._left = "";
    wrapperOuter.attr("style", "");
    wrapperOuter.classed(css.absPosVert, "");
    wrapperOuter.classed(css.absPosHoriz, "");
    wrapperOuter.classed(css.menuOpenLeftSide, "");
    wrapper.style("max-height", "");
  }

  _setHorizontalMenuHeight() {
    const { wrapper } = this.DOM;

    let wrapperHeight = null;
    if (this.menuEntity && this.OPTIONS.MENU_DIRECTION == MENU_HORIZONTAL && this.menuEntity.menuItems.length) {
      const oneItemHeight = parseInt(this.menuEntity.menuItems[0].entity.style("height"), 10) || 0;
      const menuMaxHeight = oneItemHeight * this._maxChildCount;
      const rootMenuHeight = Math.max(this.menuEntity.menuItems.length, 3) * oneItemHeight + this.menuEntity.entity.node().offsetTop + parseInt(wrapper.style("padding-bottom"), 10);
      wrapperHeight = "" + Math.max(menuMaxHeight, rootMenuHeight) + "px";
    }
    wrapper.classed(css.noTransition, true);
    wrapper.node().offsetHeight;
    wrapper.style("height", wrapperHeight);
    wrapper.node().offsetHeight;
    wrapper.classed(css.noTransition, false);
  }

  //search listener
  _enableSearch() {
    const _this = this;

    const input = this.DOM.wrapperHeader.select("." + css.search);

    //it forms the array of possible queries
    const getMatches = function(value) {
      const matches = {
        _id: "root",
        children: []
      };

      //translation integration
      const translationMatch = function(value, data, i) {

        //search name in all datasources
        const item = data[i];
        let translate = item.type == "folder" && item.name || item.type == "indicator" && item.byDataSources.map(m => m.name).join();
        if (!translate && _this.localise) {
          const t1 = _this.localise("indicator" + "/" + data[i][_this.OPTIONS.SEARCH_PROPERTY] + "/" + _this._targetModel._type);
          translate =  t1 || _this.localise("indicator/" + data[i][_this.OPTIONS.SEARCH_PROPERTY]);
        }
        return translate && translate.toLowerCase().indexOf(value.toLowerCase()) >= 0;
      };

      const matching = function(data) {
        const SUBMENUS = _this.OPTIONS.SUBMENUS;
        for (let i = 0; i < data.length; i++) {
          let match = false;
          match =  translationMatch(value, data, i);
          if (match) {
            matches.children.push(data[i]);
          }
          if (!match && data[i][SUBMENUS]) {
            matching(data[i][SUBMENUS]);
          }
        }
      };
      matching(_this.dataFiltered.children);

      matches.children = utils.unique(matches.children, child => child.id);
      return matches;
    };

    let searchValueNonEmpty = false;

    const searchIt = utils.debounce(() => {
      const value = input.node().value;

      //Protection from unwanted IE11 input events.
      //IE11 triggers an 'input' event when 'placeholder' attr is set to input element and
      //on 'focusin' and on 'focusout', if nothing has been entered into the input.
      if (!searchValueNonEmpty && value == "") return;
      searchValueNonEmpty = value != "";

      if (value.length >= _this.OPTIONS.SEARCH_MIN_STR) {
        _this.redraw(getMatches(value), true);
      } else {
        _this.redraw();
      }
    }, 250);

    input.on("input", searchIt);
  }

  _selectIndicator(concept) {
    if(concept.id == this._targetModel.data.concept) return;
    this._setModelWhich(concept);
    this.toggle();
  }


  //function is redrawing data and built structure
  redraw(data, useDataFiltered) {
    const _this = this;

    let dataFiltered, allowedIDs;

    const indicatorsDB = { _default:{} };
    utils.forEach(this.services.Vizabi.Vizabi.stores.dataSources.getAll(), m => {
      m.concepts.forEach(c => {
        indicatorsDB[c.concept] = c;
      });
    });

    const targetModelName = _this._targetModel.name || _this._targetModel.config.type;

    if (useDataFiltered) {
      dataFiltered = data;
    } else {
      if (data == null) data = this._indicatorsTree;

      allowedIDs = utils.keys(indicatorsDB).filter(f => {

        //check if indicator is denied to show with allow->names->!indicator
        if (_this._targetModel.data.allow && _this._targetModel.data.allow.names) {
          if (_this._targetModel.data.allow.names.indexOf("!" + f) != -1) return false;
          if (_this._targetModel.data.allow.names.indexOf(f) != -1) return true;
          if (_this._targetModel.data.allow.namesOnlyThese) return false;
        }

        const allowedTypes = _this._targetModel.scale.allowedTypes;
        const isEntity = indicatorsDB[f].concept_type == "entity_domain" || indicatorsDB[f].concept_type == "entity_set";
        const isString = indicatorsDB[f].concept_type == "string";
        const isMeasure = indicatorsDB[f].concept_type == "measure";
        const isTime = indicatorsDB[f].concept_type == "time";
        const isConstant = f === "_default"; //TODO: refactor constants
        const indicatorScales = JSON.parse(indicatorsDB[f].scales || null);

        //keep indicator if nothing is specified in tool properties or if any scale is allowed explicitly
        if (!allowedTypes || !allowedTypes.length || allowedTypes[0] == "*") return true;

        //match specific scale types if defined
        if(indicatorScales) {
          for (let i = indicatorScales.length - 1; i >= 0; i--) {
            if (allowedTypes.includes(indicatorScales[i])) return true;
          }
        }

        //otherwise go by concept types
        if (isEntity){
          //for entities need an ordinal scale to be allowed at this point
          if (allowedTypes.includes("ordinal")) return true;
        } else if (isConstant) {
          //for constants need a ordinal scale to be allowed
          if (allowedTypes.includes("ordinal")) return true;
        } else if (isString) {
          //for strings need a ordinal scale to be allowed
          if (allowedTypes.includes("ordinal")) return true;
        } else if (isMeasure){
          // for measures need linear or log or something
          if (allowedTypes.includes("linear") || allowedTypes.includes("log")
            || allowedTypes.includes("genericLog") || allowedTypes.includes("pow")) return true;
        } else if (isTime) {
          if (allowedTypes.includes("time")) return true;
        }

        return false;
      });
      const satisfiesAllowedSpaces = (item) => {
        //optionally check if at least one space in at least one space of at least one DS of a menu item satisfies the "allow.space" filter
        let spacesFromAllDS = [];
        item.byDataSources.forEach(item => spacesFromAllDS = spacesFromAllDS.concat(item.spaces));
        return spacesFromAllDS.some(space => this._targetModel.data.allow.space.filter(space));          
      }
      dataFiltered = utils.pruneTree(data, f => allowedIDs.includes(f.id) && f.type == "indicator" && satisfiesAllowedSpaces(f));

      this.dataFiltered = dataFiltered;
    }

    const { wrapper, wrapperOuter, wrapperHeader } = this.DOM;
    wrapper.classed("vzb-hidden", !useDataFiltered).select("ul").remove();

    let title = "";
    if (this._title || this._title === "") {
      title = this._title;
    } else {
      title = this.localise("buttons/" + targetModelName);
    }
    wrapperHeader.select("." + css.title).select("span")
      .text(title);

    wrapperHeader.select("." + css.search)
      .attr("placeholder", this.localise("placeholder/search") + "...");

    this._maxChildCount = 0;
    let selected = utils.getProp(_this._targetModel, _this._targetProp);
    const selectedPath = [];
    utils.eachTree(dataFiltered, (f, parent) => {
      if (f.children && f.children.length > _this._maxChildCount) _this._maxChildCount = f.children.length;
      if (f.id === selected && parent) {
        selectedPath.unshift(f.id);
        selected = parent.id;
      }
    });
    this.OPTIONS.selectedPath = selectedPath;

    if (this.OPTIONS.IS_MOBILE) {
      this.OPTIONS.MENU_DIRECTION = MENU_VERTICAL;
    } else {
      this.OPTIONS.MENU_DIRECTION = MENU_HORIZONTAL;
    }
    this.OPTIONS.createSubmenu = this._createSubmenu.bind(this);
    this.OPTIONS.COL_WIDTH = this.profileConstants.col_width;

    this.selectedNode = null;
    wrapper.datum(dataFiltered);
    this.menuEntity = new Menu(this, null, wrapper, this.OPTIONS);
    wrapper.classed("vzb-hidden", false);

    this._setHorizontalMenuHeight();

    if (!useDataFiltered) {
      let pointer = "_default";
      if (allowedIDs.indexOf(utils.getProp(this._targetModel, this._targetProp)) > -1) pointer = utils.getProp(this._targetModel, this._targetProp);
      const concept = indicatorsDB[pointer];
      if (!concept) utils.error("Concept properties of " + pointer + " are missing from the set, or the set is empty. Put a breakpoint here and check what you have in indicatorsDB");

      const scaleTypesData = resolveDefaultScales(concept).filter(f => {
        if (!_this._targetModel.data.allow || !_this._targetModel.data.allow.scales) return true;
        if (_this._targetModel.data.allow.scales[0] == "*") return true;
        return _this._targetModel.data.allow.scales.indexOf(f) > -1;
      });
      if (scaleTypesData.length == 0) {
        this.element.select("." + css.scaletypes).classed(css.hidden, true);
      } else {

        let scaleTypes = this.element.select("." + css.scaletypes).classed(css.hidden, false).selectAll("span")
          .data(scaleTypesData, d => d);

        scaleTypes.exit().remove();

        scaleTypes = scaleTypes.enter().append("span")
          .on("click", (event, d) => {
            event.stopPropagation();
            _this._setModelScaleType(d);
          })
          .merge(scaleTypes);

        const mdlScaleType = _this._targetModel.scale.type;

        scaleTypes
          .classed(css.scaletypesDisabled, scaleTypesData.length < 2 || _this._scaletypeSelectorDisabled)
          .classed(css.scaletypesActive, d => (d == mdlScaleType || d === "log" && mdlScaleType === "genericLog") && scaleTypesData.length > 1)
          .text(d => _this.localise("scaletype/" + d));
      }

    }

    return this;
  }

  _createSubmenu(select, data, toplevel) {
    if (!data.children) return;
    const _this = this;
    const targetModelName = _this._targetModel.name || _this._targetModel.config.type;
    const _select = toplevel ? select : select.append("div")
      .classed(css.list_outer, true);

    const li = _select.append("ul")
      .classed(css.list, !toplevel)
      .classed(css.list_top_level, toplevel)
      .classed("vzb-dialog-scrollable", true)
      .selectAll("li")
      .data(data.children, d => d["id"])
      .enter()
      .append("li");

    li.append("span")
      .classed(css.list_item_label, true)
      // .attr("info", function(d) {
      //   return d.id;
      // })
      .attr("children", d => d.children ? "true" : null)
      .attr("type", d => d.type ? d.type : null)
      .style("color", d => {
        if (this.ui.showDataSources && d.type == "indicator" && d.id !== "_default" && d.byDataSources.length == 1) {
          return this.dsColorScaleDark(d.byDataSources[0].dataSource.id);
        } else {
          return null;
        }
      })
      .on("click", function(event, d) {
        const view = d3.select(this);
        //only for leaf nodes
        if (view.attr("children")) return;
        event.stopPropagation();
        _this._selectIndicator(d);
      })
      .append("span")
      .text(d => {
        //Let the indicator "_default" in tree menu be translated differnetly for every hook type
        const translated = d.id === "_default" ? _this.localise("indicator/_default/" + targetModelName) : getItemName(d);
        if (!translated && translated !== "") utils.warn("translation missing: NAME of " + d.id);
        return translated || "";
      });

    li.classed(css.list_item, true)
      .classed(css.hasChild, d => d["children"])
      .classed(css.isSpecial, d => d["special"])
      .each(function(d) {
        const view = d3.select(this);

        //deepLeaf
        if (!d.children) {
          if (d.id === "_default") {
            d.byDataSources[0].name = _this.localise("indicator/_default/" + targetModelName);
            d.byDataSources[0].description = _this.localise("description/_default/" + targetModelName);
          }
          const deepLeaf = view.append("div")
            .attr("class", css.menuHorizontal + " " + css.list_outer + " " + css.list_item_leaf);
          deepLeaf.on("click", (event, d) => {
            _this._selectIndicator(d);
          });
        }

        if (d.id == utils.getProp(_this._targetModel, _this._targetProp)) {
          let parent;
          if (_this.selectedNode && toplevel) {
            parent = _this.selectedNode.parentNode;
            d3.select(_this.selectedNode)
              .select("." + css.list_item_leaf).classed("active", false);
            while (!(utils.hasClass(parent, css.list_top_level))) {
              if (parent.tagName == "UL") {
                d3.select(parent.parentNode)
                  .classed("active", false);
              }
              parent = parent.parentNode;
            }
          }
          if (!_this.selectedNode || toplevel) {
            parent = this.parentNode;
            d3.select(this).classed("item-active", true)
              .select("." + css.list_item_leaf).classed("active", true);
            while (!(utils.hasClass(parent, css.list_top_level))) {
              if (parent.tagName == "UL") {
                d3.select(parent.parentNode)
                  .classed("active", true);
              }
              if (parent.tagName == "LI") {
                d3.select(parent).classed("item-active", true);
              }
              parent = parent.parentNode;
            }
            _this.selectedNode = this;
          }
        }
      });
  }

  updateView() {
    if (!this._targetModel) return;
    if (!this._indicatorsTree) return console.error("Tree menu: indicator tree has not been constructed (yet?)");

    const { wrapperHeader, wrapperOuter } = this.DOM;

    wrapperOuter.classed(css.absPosVert, this._top);
    wrapperOuter.classed(css.alignYt, this._alignY === "top");
    wrapperOuter.classed(css.alignYb, this._alignY === "bottom");
    wrapperOuter.classed(css.absPosHoriz, this._left);
    wrapperOuter.classed(css.alignXl, this._alignX === "left");
    wrapperOuter.classed(css.alignXr, this._alignX === "right");

    this.redraw();

    if (this._showWhenReady) this.setHiddenOrVisible(false).showWhenReady(false);

    wrapperHeader.select("." + css.search).node().value = "";

    return this;
  }

  _focusSearch(focus = true) {
    const searchInput = this.DOM.wrapperHeader.select("." + css.search).node();

    if (focus) {
      searchInput.focus();
    } else {
      searchInput.blur();
    }
  }

  _setModelScaleType(type){
    this._targetModel.scale.config.type = type;
  }

  _setModelWhich(concept) {    
    if(concept.id == "_default"){
      this._targetModel.setWhich({
        key: null,
        value: {concept: "_default", dataSource: null}
      });
    } else {
      const {space, dataSource} = this.getBestFittingDataSourceAndSpace(concept.byDataSources);
      this._targetModel.setWhich({
        key: space,
        value: {concept: concept.id, dataSource: dataSource.id}
      });
    }
  }

  getBestFittingDataSourceAndSpace(byDataSources) {
    const bestSpacePerDataSource = byDataSources.map(m => this.getNearestSpaceToMarkerSpace(m.spaces));
    const bestSpace = this.getNearestSpaceToMarkerSpace(bestSpacePerDataSource);

    const dsCandidates = byDataSources.filter(f => f.spaces.find(s => spacesAreEqual(s, bestSpace))).map(m => m.dataSource);
     
    if (dsCandidates.includes(this.model.data.source))
      return {space: bestSpace, dataSource: this.model.data.source};
    else if (dsCandidates.includes(this._targetModel.data.source)) 
      return {space: bestSpace, dataSource: this._targetModel.data.source};
    else
      return {space: bestSpace, dataSource: dsCandidates[0]};
  }

  getNearestSpaceToMarkerSpace(spaces){
    //concept has an available space same as already set in marker: perfect match!
    if (spaces.find(f => spacesAreEqual(f, this.model.data.space))) 
      return this.model.data.space;

    //otherwise return space that is closest by length to marker space length
    //so we prioritise [country, gender, time] over [country, gender, age, time]
    const markerSpaceLen = this.model.data.space.length;
    const spacesPrio = spaces.concat()
      .sort((a, b) => Math.abs(a.length - markerSpaceLen) - Math.abs(b.length - markerSpaceLen));
    return spacesPrio[0];
  }

  setup() {
    this.state = {
      ownReadiness: STATUS.INIT
    };

    // object for manipulation with menu representation level
    this.menuEntity = null;

    this._alignX = "center";
    this._alignY = "center";

    //options
    this.OPTIONS = utils.deepClone(OPTIONS);

    //general markup
    this.DOM = {
    };

    this.element.classed(css.hidden, true)
      .append("div")
      .attr("class", css.background)
      .on("click", (event) => {
        event.stopPropagation();
        this.toggle();
      });

    const wrapperOuter = this.DOM.wrapperOuter = this.element
      .append("div")
      .classed(css.wrapper_outer, true)
      .classed(css.noTransition, true);

    const wrapperHeader = this.DOM.wrapperHeader = wrapperOuter
      .append("div")
      .classed(css.wrapper_header, true)

    wrapperHeader.append("div")
      .attr("class", css.close)
      .html(iconClose)
      .on("click", (event) => {
        event.stopPropagation();
        this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", css.close + "-icon");

    wrapperHeader.append("div")
      .classed(css.scaletypes, true)
      .append("span");

    wrapperHeader.append("div")
      .classed(css.title, true)
      .append("span");

    wrapperHeader.append("div")
      .classed(css.search_wrap, true)
      .append("input")
      .classed(css.search, true)
      .attr("type", "search")
      .attr("id", css.search);

    const wrapper = this.DOM.wrapper = wrapperOuter
      .append("div")
      .classed(css.wrapper, true)
      .classed(css.noTransition, true)
      .classed("vzb-dialog-scrollable", true);

    wrapper
      .on("click", (event) => {
        event.stopPropagation();
      });

    wrapper.on("mouseleave", () => {
      //if(_this.menuEntity.direction != MENU_VERTICAL) _this.menuEntity.closeAllChildren();
    });

    const datasources = this._getDataModels(this.root.model.config.dataSources);
    this.dsColorScaleLight = d3.scaleOrdinal().range(d3.schemePastel2).domain(datasources.map(m=>m.id));
    this.dsColorScaleDark = d3.scaleOrdinal().range(d3.schemeSet2).domain(datasources.map(m=>m.id));
  }

  draw() {
    this.localise = this.services.locale.auto();
    this.addReaction(this._prepareTags, true);

    this._updateLayoutProfile();
    this.addReaction(this._resize);
  }

  _prepareTags() {
    runInAction(() => {
      this.state.ownReadiness = STATUS.PENDING;
    });
    const datasources = this._getDataModels(this.root.model.config.dataSources);
    if (this.services.Vizabi.Vizabi.utils.combineStates(datasources.map(ds => ds.state)) == "fulfilled") {
      const localeId = this.services.locale.id;
      runInAction(() => {
        this.getTags(localeId)
          .then(tags => {
            return this._buildIndicatorsTree({
              tagsArray: tags,
              dataModels: this._getDataModels(this.root.model.config.dataSources)
            });})
          .then(this.updateView.bind(this))
          .then(() => {
            this._enableSearch();
            this.state.ownReadiness = STATUS.READY;
          });
      });
    }
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return "TreeMenu _updateProfile() abort: container is too little or has display:none";
  }

  _getDatasetName(ds) {
    if (ds.reader.getDatasetInfo) {
      const meta = ds.reader.getDatasetInfo();
      return meta.name + (meta.version ? " " + meta.version : "");
    }
    return ds.id ?? "Unnamed datasource";
  }

  _getDataModels(dsConfig) {
    return Object.keys(dsConfig).map(dsName => this.services.Vizabi.Vizabi.stores.dataSources.get(dsName));
  }

  _nestAvailabilityByConcepts(availability){
    return availability.reduce((map, kv) => {
      const key = kv.value;
      const space = kv.key;
      if (!map.has(key)) map.set(key, {source: kv.source, spaces: new Set()});
      map.get(key).spaces.add(space);
      return map;
    }, new Map());
  }

  //returns concepts and their spaces (availbility keys), 
  //such that only strict superspaces, strict subspaces and matching spaces remain
  _conceptsCompatibleWithMarkerSpace(availabilityMapByConcepts, markerSpace){
    const filteredValueLookup = new Map();
    const markerSpaceSet = new Set(markerSpace);
    const intersect = (a,b) => a.filter(e => b.has(e));
    for (const [concept, {source, spaces}] of availabilityMapByConcepts) {  
      const filteredSpaces = [...spaces].filter(space => {
        const intersection = intersect(space, markerSpaceSet);
        return intersection.length == markerSpaceSet.size || intersection.length == space.length;
      });
      if (filteredSpaces.length) filteredValueLookup.set(concept, {source, spaces: filteredSpaces});
    }
    return filteredValueLookup;
  }

  _convertConceptMapToArray(conceptmap){
    return [...conceptmap].map(([concept, {source, spaces}]) => ({concept, source, spaces: [...spaces]}));
  }

  __observeDataSources() {
    return this._getDataModels(this.root.model.config.dataSources).map(ds => [ds.state, ds.config]);
  }

  _getAvailability(){
    const items = [];
    this._getDataModels(this.root.model.config.dataSources).forEach(ds => {
      ds.availability.data.forEach(kv => {
        items.push({ key: kv.key, value: ds.getConcept(kv.value), source: ds });
      });
    });
    return items;
  }

  /**
   * Return tag entities with name and parents from all data sources
   * @return {array} Array of tag objects
   */
  getTags(locale) {
    const TAG_KEY = "tag";
    const query = {
      select: {
        key: [TAG_KEY],
        value: []
      },
      language: locale,
      from: "entities"
    };

    const dataSources = this._getDataModels(this.root.model.config.dataSources).reduce((res, ds) => {
      res.set(ds, utils.deepClone(query));
      return res;
    }, new Map());

    this._getAvailability()
      .filter(f => f.key.join() == TAG_KEY)
      .forEach(av => {
        dataSources.get(av.source).select.value.push(av.value.concept);
      });

    const dataSourcesWithTags = [...dataSources].filter(([ds, query]) => query.select.value.length);

    return dataSourcesWithTags.length ? Promise.all(dataSourcesWithTags
      .map(([ds, query]) => ds.query(query).then(result => {
        return [...result.forQueryKey().values()].map(r => {
          r.datasource = ds;
          return r;
        });
      })))
      .then(results => this.mergeResults(results, ["tag"])) // using merge because key-duplicates terribly slow down treemenu
      : Promise.resolve([]);    
  }

  /**
   * Merges query results. The first result is base, subsequent results are only added if key is not yet in end result.
   * @param  {array of arrays} results Array where each element is a result, each result is an array where each element is a row
   * @param  {array} key     primary key to each result
   * @return {array}         merged results
   */
  mergeResults(results, key) {
    const keys = new Map();
    results.forEach(result => {
      result.forEach(row => {
        const keyString = this.createKeyString(key, row);
        if (!keys.has(keyString))
          keys.set(keyString, row);
      });
    });
    return Array.from(keys.values());
  }

  createKeyString(key, row) {
    return key.map(concept => row[concept]).join(",");
  }

}
