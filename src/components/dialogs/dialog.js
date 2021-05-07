import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import {decorate, computed} from "mobx";
import { ICON_DRAG as iconDrag, ICON_PIN as iconPin } from "../../icons/iconset";
//import requireAll from "helpers/requireAll";
//const dialogTemplates = requireAll(require.context("components/dialogs/", true, /\.html$/));
import "./dialog.scss";
/*!
 * VIZABI DIALOG
 * Reusable Dialog component
 */

const PROFILE_CONSTANTS = {
  SMALL: {},
  MEDIUM: {},
  LARGE: {}
};


const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  SMALL: {},
  MEDIUM: {},
  LARGE: {}
};


const CollectionMixin = superClass => class extends superClass {
  //static _collection = {};
  static add(name, addedClass) {
    CollectionMixin._collection[name] = addedClass;
  }
  static get(name) { return CollectionMixin._collection[name];}
};

CollectionMixin._collection = {};

class Dialog extends CollectionMixin(BaseComponent) {
  constructor(config) {

    super(config);
  } 

  setup() {
    this.DOM = {
      dialog: this.element.select(".vzb-dialog-modal"),
      title: this.element.select(".vzb-dialog-modal>.vzb-dialog-title"),
      buttons: d3.select(this.element.selectAll(".vzb-dialog-modal>.vzb-dialog-buttons").nodes().pop()),
      content: this.element.select(".vzb-dialog-modal > .vzb-dialog-content"),
      dragHandler: this.element.select("[data-click='dragDialog']"),
      pinIcon: this.element.select("[data-click='pinDialog']")
    };
    this.transitionEvents = ["webkitTransitionEnd", "transitionend", "msTransitionEnd", "oTransitionEnd"];

    this.state["opened"] = false;

    const _this = this;

    this.DOM.dragHandler.html(iconDrag);
    this.DOM.pinIcon.html(iconPin);
    this.DOM.pinIcon.on("click", () => {
      this.setPin(!this.getPin());
    });

    const dg = dialogDrag(this.element, this.root.element, 10);
    const dragBehavior = d3.drag()
      .on("start", () => {
        const topPos = _this.element.node().offsetTop;
        _this.element.style("top", topPos + "px");
        _this.element.style("bottom", "auto");
        _this.element.dispatch("custom-dragstart");
        dg.dragStart(d3.event);
      })
      .on("drag", () => {
        _this.element.dispatch("custom-drag");
        dg.drag(d3.event);
      })
      .on("end", () => {
        _this.rightPos = _this.element.style("right");
        _this.topPos = _this.element.style("top");
        _this.element.dispatch("custom-dragend");
      });
    this.DOM.dragHandler.call(dragBehavior);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted
    };
  }


  draw() {
    this.localise = this.services.locale.auto();

    this._localiseDialogTexts();

    if (this._updateLayoutProfile()) return; //return if exists with error
    this.addReaction(this._pinButtonUpdate);
    this.addReaction(this._updateSize);
  }

  resize() {
    
  }

  _localiseDialogTexts() {
    const _this = this;
    this.element.selectAll("span[data-localise]").each(function(d) {
      const view = d3.select(this);
      view.text(_this.localise(view.attr("data-localise")));
    });
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return utils.warn("Dialog _updateProfile() abort: container is too little or has display:none");
  }

  _updateSize() {
    this.services.layout.size;
    
    if (this.element.classed("vzb-top-dialog")) {
      this.element.classed("notransition", true);

      const profile = this.services.layout.profile;

      if (profile !== "SMALL") {
        const chartWidth = this.root.element.node().offsetWidth || 0;
        const chartHeight = this.root.element.node().offsetHeight || 0;
        const dialogWidth = parseInt(this.element.style("width"), 10) || 0;
        const dialogHeight = parseInt(this.element.style("height"), 10) || 0;

        const dialogRight = parseInt(this.rightPos, 10);
        const dialogTop = parseInt(this.topPos, 10);
        const dialogRightMargin = parseInt(this.element.style("margin-right"), 10) || 0;
        if (utils.isNumber(dialogRight) && dialogRight > chartWidth - dialogWidth - dialogRightMargin) {
          if (this.rightPos) {
            this.rightPos = (chartWidth - dialogWidth - dialogRightMargin) + "px";
            if (this.isOpen) this.element.style("right", this.rightPos);
          }
        }
        if (utils.isNumber(dialogTop) && utils.isNumber(dialogHeight) && dialogTop >= 0 && dialogTop > chartHeight - dialogHeight) {
          if (this.topPos) {
            this.topPos = ((chartHeight - dialogHeight) > 0 ? (chartHeight - dialogHeight) : 0)  + "px";
            if (this.isOpen) this.element.style("top", this.topPos);
          }
        }

        if (this.topPos && (profile === "LARGE" && this.root.element.classed("vzb-dialog-expand-true"))) {
          this.element.style("bottom", "auto");
        }

        if (this.root.element.classed("vzb-landscape")) {
          // var contentHeight = parseInt(this.root.element.style('height'));
          // var placeholderHeight = parseInt(this.element.style('height'));
          // if (contentHeight < placeholderHeight) {
          //   this.topPos = (-contentHeight + 50) + 'px';
          //   this.rightPos = '';
          //   this.element.style('right', this.rightPos);
          //   this.element.style('bottom', 'auto');
          // } else {
          //   //this.topPos = '';
          //   this.element.style('bottom', '');
          // }
        }
        //this.element.style('top', this.topPos);
        this.DOM.dialog.style("max-height", "");
      } else {
        this.rightPos = "";
        this.topPos = "";
        this.element.attr("style", "");
        // var totalHeight = this.root.element.offsetHeight;
        // if(this.root.element.classed('vzb-portrait')) totalHeight = totalHeight - 50;
        // this.DOM.dialog.style('max-height', (totalHeight - 10) + 'px');
      }

      this.DOM.dragHandler.classed("vzb-hidden", profile === "SMALL");
      this.DOM.pinIcon.classed("vzb-hidden", profile === "SMALL");

      this._setMaxHeight();
    }
  }

  _setMaxHeight() {
    let totalHeight = this.root.element.node().offsetHeight;
    const profile = this.services.layout.profile;
    if (profile !== "SMALL") {
      if (!this.topPos && (profile === "LARGE" && this.root.element.classed("vzb-dialog-expand-true"))) {
        const dialogBottom = parseInt(this.element.style("bottom"), 10);
        totalHeight -= dialogBottom;
      } else {
        const topPos = this.topPos ? parseInt(this.topPos, 10) : this.element.node().offsetTop;
        totalHeight -= topPos;
      }
    } else {
      totalHeight = this.root.element.classed("vzb-portrait") ? totalHeight - 50 : totalHeight - 10;
    }

    this.DOM.dialog.style("max-height", totalHeight + "px");

    //set 'max-height' to content for IE11
    const contentHeight = totalHeight - this.DOM.title.node().offsetHeight - ((this.DOM.buttons.node() || {}).offsetHeight || 0);
    this.DOM.content.style("max-height", contentHeight + "px");
  }

  beforeOpen() {
    const _this = this;

    this.transitionEvents.forEach(event => {
      _this.element.on(event, _this._transitionEnd.bind(_this, event));
    });

    this.element.classed("notransition", true);

    this.element.style("top", ""); // issues: 369 & 442
    this.element.style("bottom", ""); // issues: 369 & 442

    if (this.topPos && this.services.layout.profile === "LARGE" && this.root.element.classed("vzb-dialog-expand-true")) {
      const topPos = this.element.node().offsetTop;
      this.element.style("top", topPos + "px"); // issues: 369 & 442
      this.element.style("bottom", "auto"); // issues: 369 & 442
    } else if (this.services.layout.profile !== "SMALL") {
      //if(this.rightPos) this.element.style('right', this.rightPos);
    }

    this.element.node().offsetTop;
    this.element.classed("notransition", false);

    if (this.services.layout.profile === "SMALL") {
      this.element.style("top", ""); // issues: 369 & 442
    } else if (this.root.element.classed("vzb-landscape")) { // need to recalculate popup position (Safari 8 bug)
      // var contentHeight = parseInt(this.root.element.style('height'));
      // var placeholderHeight = parseInt(this.element.style('height'));
      // if (contentHeight < placeholderHeight) {
      //   this.topPos = (-contentHeight + 50) + 'px';
      //   this.rightPos = '';
      //   this.element.style('right', this.rightPos);
      //   this.element.style('bottom', 'auto');
      // } else {
      //   this.topPos = '';
      //   this.element.style('bottom', '');
      // }
      //this.element.style('top', this.topPos);
    }

  }

  /**
   * User has clicked to open this dialog
   */
  open() {
    this.isOpen = true;
    if (this.services.layout.profile !== "SMALL") {
      if (this.topPos) {
        this.element.style("top", this.topPos);
        this.element.style("right", this.rightPos);
      }
    }
  }

  beforeClose() {
    //issues: 369 & 442
    if (this.root.element.classed("vzb-portrait") && this.services.layout.profile === "SMALL") {
      this.element.style("top", "auto"); // issues: 369 & 442
    }
    if (this.services.layout.profile === "LARGE" && this.root.element.classed("vzb-dialog-expand-true")) {
      this.topPos0 = this.topPos ? (this.element.node().parentNode.offsetHeight - this.element.node().offsetHeight) + "px" : "";
    }
    this.element.classed("notransition", false);
    this.element.node().offsetHeight; // trigger a reflow (flushing the css changes)
  }

  /**
   * User has closed this dialog
   */
  close() {
    //issues: 369 & 442
    if (!(this.root.element.classed("vzb-portrait") && this.services.layout.profile === "SMALL")) {
      this.element.style("top", ""); // issues: 369 & 442
      this.element.style("right", ""); // issues: 369 & 442
    }

    if (this.services.layout.profile === "LARGE" && this.root.element.classed("vzb-dialog-expand-true")) {
      this.element.style("top", this.topPos0);
      this.element.style("right", "");
    }
    this.isOpen = false;
    //this.trigger("close");
  }

  _transitionEnd(eventName) {
    const _this = this;

    this.transitionEvents.forEach(event => {
      _this.element.on(event, null);
    });
    if (this.isOpen) {
      this.element.classed("notransition", true);
    }
  }

  setOpen(state) {
    this.ui.opened = state;
  }

  getOpen() {
    return this.ui.opened;
  }

  setPin(state) {
    this.ui.pinned = state;
  }

  getPin() {
    return this.ui.pinned;
  }

  _pinButtonUpdate() {
    this.element.classed("pinned", this.getPin());
  }  
}

Dialog.DEFAULT_UI = {
  opened: false,
  pinned: false
};

const decorated = decorate(Dialog, {
  "MDL": computed
});
export { decorated as Dialog };

function dialogDrag(element, container, xOffset) {
  let posX, posY, divTop, divRight, marginRight, marginLeft, xOffsetRight, xOffsetLeft, eWi, eHe, cWi, cHe, diffX, diffY;

  return {
    move(x, y) {
      element.style("right", x + "px");
      element.style("top", y + "px");
    },

    dragStart(evt) {
      if (!utils.isTouchDevice()) {
        posX = evt.sourceEvent.clientX;
        posY = evt.sourceEvent.clientY;
      } else {
        const touchCoord = d3.touches(container.node());
        posX = touchCoord[0][0];
        posY = touchCoord[0][1];
      }
      divTop = parseInt(element.style("top")) || 0;
      divRight = parseInt(element.style("right")) || 0;
      marginLeft = parseInt(element.style("margin-left")) || 0;
      marginRight = parseInt(element.style("margin-right")) || 0;
      xOffsetLeft = Math.min(xOffset, marginLeft);
      xOffsetRight = Math.min(xOffset, marginRight);
      eWi = (parseInt(element.style("width"), 10) + marginLeft - xOffsetLeft) || 0;
      eHe = parseInt(element.style("height"), 10) || 0;
      cWi = (container.node().offsetWidth - marginRight) || 0;
      cHe = container.node().offsetHeight || 0;
      diffX = posX + divRight;
      diffY = posY - divTop;
    },

    drag(evt) {
      if (!utils.isTouchDevice()) {
        posX = evt.sourceEvent.clientX;
        posY = evt.sourceEvent.clientY;
      } else {
        const touchCoord = d3.touches(container.node());
        posX = touchCoord[0][0];
        posY = touchCoord[0][1];
      }
      let aX = -posX + diffX,
        aY = posY - diffY;
      if (aX < -xOffsetRight) aX = -xOffsetRight;
      if (aY < 0) aY = 0;
      if (aX + eWi > cWi) aX = cWi - eWi;
      if (aY + eHe > cHe) aY = cHe - eHe;

      this.move(aX, aY);
    }
  };
}
