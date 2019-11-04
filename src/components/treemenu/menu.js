import { css, MENU_HORIZONTAL, MENU_VERTICAL } from "./config";
import * as utils from "../../legacy/base/utils";

export class Menu {
  constructor(parent, menu, options) {
    const _this = this;
    this.parent = parent;
    this.OPTIONS = options;
    this.width = this.OPTIONS.MIN_COL_WIDTH;
    this.direction = this.OPTIONS.MENU_DIRECTION;

    this.OPTIONS.createSubmenu(menu, menu.datum(), parent === null);
    this.entity = parent === null ? menu.selectAll("." + css.list_top_level) : menu.select("." + css.list_outer);

    this._setDirectionClass();
    this.menuItems = [];
    let menuItemsHolder;

    if (this.entity.empty()) return this;

    this.entity.each(function() {
      menuItemsHolder = d3.selectAll(this.childNodes).filter(function() {
        return d3.select(this).classed(css.list);
      });
    });
    if (menuItemsHolder.empty()) menuItemsHolder = this.entity;
    this.entity.selectAll("." + css.list_item)
      .filter(function() {
        return this.parentNode == menuItemsHolder.node();
      })
      .each(function() {
        _this.addSubmenu(d3.select(this));
      });
    if (!this.menuItems.length && this.isActive()) {
      this.buildLeaf();
    }
    this.setWidth(this.OPTIONS.COL_WIDTH, false, true);
    return this;
  }

  setWidth(width, recursive, immediate) {
    if (this.width != width && this.entity.node()) {
      this.width = width;
      if ((this.entity.classed(css.list_top_level) || this.entity.classed("active")) && this.direction == MENU_HORIZONTAL) {
        if (!immediate) {
          this.entity.transition()
            .delay(0)
            .duration(100)
            .style("width", this.width + "px");
        } else {
          this.entity.style("width", this.width + "px");
        }
      }
      if (this.entity.classed(css.list_top_level)) {
        this.entity.selectAll("." + css.leaf).style("width", this.width - 1 + "px");
      }
      if (recursive) {
        for (let i = 0; i < this.menuItems.length; i++) {
          this.menuItems[i].setWidth(this.width, recursive, immediate);
        }
      }
      return this;
    }
  }

  /**
   * configure menu type (horizontal or vertical)
   * @param direction MENU_HORIZONTAL or MENU_VERTICAL
   * @param recursive change direction over menu sublevels
   * @returns {Menu}
   */
  setDirection(direction, recursive) {
    this.direction = direction;
    this.entity
      .style("width", "")
      .style("height", "");
    if (recursive) {
      for (let i = 0; i < this.menuItems.length; i++) {
        this.menuItems[i].setDirection(this.direction, recursive);
      }
    }
    this._setDirectionClass();
    return this;
  }

  _setDirectionClass() {
    if (this.direction == MENU_HORIZONTAL) {
      this.entity.classed(css.menuVertical, false);
      this.entity.classed(css.menuHorizontal, true);
    } else {
      this.entity.classed(css.menuHorizontal, false);
      this.entity.classed(css.menuVertical, true);
    }
  }

  addSubmenu(item) {
    this.menuItems.push(new MenuItem(this, item, this.OPTIONS));
  }

  open() {
    const _this = this;
    if (!this.isActive()) {
      _this.parent.parentMenu.openSubmenuNow = true;
      this.closeNeighbors(() => {
        if (_this.direction == MENU_HORIZONTAL) {
          if (!this.menuItems.length) _this.buildLeaf();
          _this._openHorizontal();
          _this.calculateMissingWidth(0);
        } else {
          _this._openVertical();
        }
      });
      _this.parent.parentMenu.openSubmenuNow = false;
    }
    return this;
  }

  /**
   * recursively calculate missed width for last menu level
   * @param width
   * @param cb
   */
  calculateMissingWidth(width, cb) {
    const _this = this;
    if (this.entity.classed(css.list_top_level)) {
      if (width > this.OPTIONS.MAX_MENU_WIDTH) {
        if (typeof cb === "function") cb(width - this.OPTIONS.MAX_MENU_WIDTH);
      }
    } else {
      this.parent.parentMenu.calculateMissingWidth(width + this.width, widthToReduce => {
        if (widthToReduce > 0) {
          _this.reduceWidth(widthToReduce, newWidth => {
            if (typeof cb === "function") cb(newWidth); // callback is not defined if it is emitted from this level
          });
        } else if (typeof cb === "function") cb(widthToReduce);
      });
    }
  }

  /**
   * restore width (if it was reduced before)
   * @param width
   * @param isClosedElement (parameter for check if curent element emit this action)
   * @param cb
   */
  restoreWidth(width, isClosedElement, cb) {
    const _this = this;
    if (isClosedElement) {
      this.parent.parentMenu.restoreWidth(width, false, cb);
    } else if (width <= 0) {
      if (typeof cb === "function") cb();
    } else if (!this.entity.classed(css.list_top_level)) {
      const currentElementWidth =  this.entity.node().offsetWidth;
      const newElementWidth = Math.min(width, _this.width);
      if (currentElementWidth < newElementWidth) {
        const duration = 250 * (currentElementWidth / newElementWidth);
        this.entity.transition()
          .delay(0)
          .duration(duration)
          .style("width", newElementWidth + "px")
          .on("end", () => {
          });
        _this.parent.parentMenu.restoreWidth(width - newElementWidth, false, cb);
      } else {
        this.parent.parentMenu.restoreWidth(width, false, cb);
      }
    } else {
      if (typeof cb === "function") cb();
    }
  }

  /**
   * made element narrower to free space for other element
   * @param width
   * @param cb
   */
  reduceWidth(width, cb) {
    const _this = this;
    const currWidth = this.entity.node().offsetWidth;

    if (currWidth <= this.OPTIONS.MIN_COL_WIDTH) {
      cb(width - _this.width + currWidth);
    } else {

      const newElementWidth = Math.max(this.OPTIONS.MIN_COL_WIDTH, _this.width - width);
      const duration = 250 / (_this.width / newElementWidth);
      this.entity.transition()
        .delay(0)
        .duration(duration)
        .style("width", newElementWidth + "px")
        .on("end", () => {
          cb(width - _this.width + newElementWidth);
        });
    }
  }

  _openHorizontal() {
    const _this = this;
    _this.entity.classed("active", true)
      .transition()
      .delay(0)
      .duration(250)
      .style("width", _this.width + "px")
      .on("end", () => {
        _this.marqueeToggle(true);
      });
  }

  _openVertical() {
    const _this = this;
    _this.entity.style("height", "0px");
    _this.entity.transition()
      .delay(0)
      .duration(250)
      .style("height", (36 * _this.menuItems.length) + "px")
      .on("end", () => {
        _this.entity.style("height", "auto");
        _this.marqueeToggle(true);
        _this.scrollToFitView();
      });
    _this.entity.classed("active", true);
  }

  closeAllChildren(cb) {
    let callbacks = 0;
    for (let i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].isActive()) {
        ++callbacks;
        this.menuItems[i].submenu.close(() => {
          if (--callbacks == 0) {
            if (typeof cb === "function") cb();
          }
        });
      }
    }
    if (callbacks == 0) {
      if (typeof cb === "function") cb();
    }
  }

  closeNeighbors(cb) {
    if (this.parent) {
      this.parent.closeNeighbors(cb);
    } else {
      cb();
    }
  }

  close(cb) {
    const _this = this;
    this.closeAllChildren(() => {
      if (_this.direction == MENU_HORIZONTAL) {
        _this._closeHorizontal(cb);
      } else {
        _this._closeVertical(cb);
      }
    });
  }

  _closeHorizontal(cb) {
    const elementWidth = this.entity.node().offsetWidth;
    const _this = this;
    const openSubmenuNow = _this.parent.parentMenu.openSubmenuNow;
    _this.entity.transition()
      .delay(0)
      .duration(20)
      .style("width", 0 + "px")
      .on("end", () => {
        _this.marqueeToggle(false);
        _this.entity.classed("active", false);
        if (!openSubmenuNow) {
          _this.restoreWidth(_this.OPTIONS.MAX_MENU_WIDTH, true, () => {
            if (typeof cb === "function") cb();
          });
        } else {
          if (typeof cb === "function") cb();
        }
      });
  }

  _closeVertical(cb) {
    const _this = this;
    _this.entity
      .transition()
      .delay(0)
      .duration(100)
      .style("height", 0 + "px")
      .on("end", () => {
        _this.marqueeToggle(false);
        _this.entity.classed("active", false);
        if (typeof cb === "function") cb();
      });
  }

  isActive() {
    return this.entity.classed("active");
  }

  hasActiveParentNeighbour() {
    return this.menuItems
      .filter(item => item.isActive())
      .some(item => !!d3.select(item.entity).node().classed(css.hasChild));
  }

  marqueeToggle(toggle) {
    for (let i = 0; i < this.menuItems.length; i++) {
      this.menuItems[i].marqueeToggle(toggle);
    }
  }

  marqueeToggleAll(toggle) {
    for (let i = 0; i < this.menuItems.length; i++) {
      this.menuItems[i].marqueeToggleAll(toggle);
    }
  }

  findItemById(id) {
    for (let i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].entity.datum().id == id) {
        return this.menuItems[i];
      }
      if (this.menuItems[i].submenu) {
        const item = this.menuItems[i].submenu.findItemById(id);
        if (item) return item;
      }
    }
    return null;
  }

  getTopMenu() {
    return this.parent ?
      this.parent.parentMenu.getTopMenu() :
      this;
  }

  scrollToFitView() {
    const treeMenuNode = this.getTopMenu().entity.node().parentNode;
    const parentItemNode = this.entity.node().parentNode;
    const menuRect = treeMenuNode.getBoundingClientRect();
    const itemRect = parentItemNode.getBoundingClientRect();
    const viewportItemTop = itemRect.top - menuRect.top;
    if (viewportItemTop + itemRect.height > menuRect.height) {
      const newItemTop = (itemRect.height > menuRect.height) ?
        (menuRect.height - 10) : (itemRect.height + 10);

      const newScrollTop = treeMenuNode.scrollTop + newItemTop - menuRect.height + viewportItemTop;

      const scrollTopTween = function(scrollTop) {
        return function() {
          const i = d3.interpolateNumber(this.scrollTop, scrollTop);
          return function(t) {
            treeMenuNode.scrollTop = i(t);
          };
        };
      };

      d3.select(treeMenuNode).transition().duration(100)
        .tween("scrolltoptween", scrollTopTween(newScrollTop));

    }

  }

  buildLeaf() {
    const leafDatum = this.entity.datum();

    this.entity.selectAll("div").data([leafDatum]).enter()
      .append("div").classed(css.leaf + " " + css.leaf_content + " vzb-dialog-scrollable", true)
      .style("width", this.width + "px")
      .each(function(d) {
        const leafContent = d3.select(this);
        leafContent.append("span").classed(css.leaf_content_item + " " + css.leaf_content_item_title, true)
          .text(utils.replaceNumberSpacesToNonBreak(d.name) || "");
        leafContent.append("span").classed(css.leaf_content_item + " " + css.leaf_content_item_descr, true)
          .text(utils.replaceNumberSpacesToNonBreak(d.description) || "");
        leafContent.append("span").classed(css.leaf_content_item + " " + css.leaf_content_item_helptranslate, true)
          .classed("vzb-invisible", !d.translateContributionLink)
          .html(`<a href="${d.translateContributionLink}" target="_blank">${d.translateContributionText}</a>`);
      });
  }
}

class MenuItem {
  constructor(parent, item, options) {
    const _this = this;
    this.parentMenu = parent;
    this.entity = item;
    this.entity.select("." + css.list_item_label).call(select => {
      if (utils.isTouchDevice()) {
        select.onTap(evt => {
          d3.event.stopPropagation();
          if (_this.parentMenu.direction == MENU_VERTICAL) {
            const view = _this.entity.select("." + css.list_item_label);
            //only for leaf nodes
            if (!view.attr("children")) return;
          }
          if (!_this.submenu) {
            _this.submenu = new Menu(_this, _this.entity, options);
          }
          _this.toggleSubmenu();
        });
      } else {
        select.on("mouseenter", function() {
          if (_this.parentMenu.direction == MENU_HORIZONTAL && !d3.select(this).attr("children")) {
            if (!_this.submenu) {
              _this.submenu = new Menu(_this, _this.entity, options);
            }
            _this.openSubmenu();
          } else if (!_this.parentMenu.hasActiveParentNeighbour()) {
            _this.closeNeighbors();
          }
          _this.marqueeToggle(true);
        }).on("click.item", function() {
          d3.event.stopPropagation();
          if (!_this.submenu) {
            _this.submenu = new Menu(_this, _this.entity, options);
          }
          if (_this.parentMenu.direction == MENU_HORIZONTAL) {
            _this.openSubmenu();
          } else {
            const view = d3.select(this);
            //only for leaf nodes
            if (!view.attr("children")) return;
            _this.toggleSubmenu();
          }
        });
      }

      if (options.selectedPath[0] === select.datum().id) {
        options.selectedPath.shift();
        _this.submenu = new Menu(_this, _this.entity, options);
      }
    });
    return this;
  }

  setWidth(width, recursive, immediate) {
    if (this.submenu && recursive) {
      this.submenu.setWidth(width, recursive, immediate);
    }
    return this;
  }

  setDirection(direction, recursive) {
    if (this.submenu && recursive) {
      this.submenu.setDirection(direction, recursive);
    }
    return this;
  }

  toggleSubmenu() {
    if (this.submenu) {
      if (this.submenu.isActive()) {
        this.submenu.close();
      } else {
        this.submenu.open();
      }
    }
  }

  openSubmenu() {
    if (this.submenu) {
      this.submenu.open();
    } else {
      this.closeNeighbors();
    }
  }

  closeNeighbors(cb) {
    this.parentMenu.closeAllChildren(cb);
  }

  isActive() {
    return this.submenu && this.submenu.isActive();
  }

  marqueeToggleAll(toggle) {
    const _this = this;
    const labels = this.entity.selectAll("." + css.list_item_label);
    labels.each(function() {
      const label = d3.select(this).select("span");
      const parent = d3.select(this.parentNode);
      parent.classed("marquee", false);
      label.style("width", "");
      if (toggle) {
        if (label.node().scrollWidth > label.node().offsetWidth) {
          label.attr("data-content", label.text());
          const space = 30;
          const offset = space + label.node().scrollWidth;
          label.style("width", offset + "px");
          parent.classed("marquee", true);
        }
      }
    });
  }

  marqueeToggle(toggle) {
    const label = this.entity.select("." + css.list_item_label).select("span");
    this.entity.classed("marquee", false);
    label.style("width", "");
    if (toggle) {
      if (label.node().scrollWidth > label.node().offsetWidth) {
        label.attr("data-content", label.text());
        const space = 30;
        const offset = space + label.node().scrollWidth;
        label.style("width", offset + "px");
        this.entity.classed("marquee", true);
      }
    }
  }
}
