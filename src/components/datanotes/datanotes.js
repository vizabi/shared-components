import * as utils from "../../legacy/base/utils.js";
import { BaseComponent } from "../base-component.js";
import "./datanotes.scss";

import { ICON_CLOSE } from "../../icons/iconset.js";



const PROFILE_CONSTANTS = {
  SMALL: {

  },
  MEDIUM: {

  },
  LARGE: {

  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {

  },
  LARGE: {

  }
};

export class DataNotes extends BaseComponent {

  constructor(config) {
    super(config);
  }


  setup() {
    this.state = {
    };

    this.DOM = {

    };


    this.hidden = true;
    this.showNotes = false;
    this.pinned = false;
    this.left = 0;
    this.top = 0;
    this.encoding = null;


    this.element.classed("vzb-hidden", this.hidden);
    this.element.append("div")
      .html(ICON_CLOSE)
      .on("click", () => {
        d3.event.stopPropagation();
        this.close();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", "vzb-data-notes-close")
      .classed("vzb-hidden", true);

    this.element.append("div")
      .attr("class", "vzb-data-notes-body vzb-dialog-scrollable");

    this.element.append("div")
      .attr("class", "vzb-data-notes-link");


  }
  
  draw() {
    this.localise = this.services.locale.auto();
    
    this.addReaction(this.setValues);
    this.addReaction(this.resize);
  }

  resize(){
    this.services.layout.width + this.services.layout.height;
    this.close();
  }

  setEncoding(enc) {
    this.encoding = enc;
    this.setValues();
    return this;
  }

  setValues() {
    if (!this.encoding) return;
    const { description, sourceLink, sourceName } = this.encoding.data.conceptProps;

    this.element.select(".vzb-data-notes-body")
      .classed("vzb-hidden", !description)
      .text(utils.replaceNumberSpacesToNonBreak(description));

    const label = this.localise("hints/source");
    this.element.select(".vzb-data-notes-link")
      .classed("vzb-hidden", !sourceLink)
      .html("<span>" + (sourceName ? (label + ": ") : "") 
        + '<a href="' + utils.normaliseLink(sourceLink) + '" target="_blank">' + (sourceName ? sourceName : label) 
        + "</a></span>");

    this.showNotes = sourceLink || description;
  }

  setPos(_left, _top, force) {
    this.left = _left;
    this.top = _top;
    if (this.pinned && !force) return this;
    const parentHeight = this.parent.element.offsetHeight;
    const width = this.element.node().offsetWidth;
    const height = this.element.node().offsetHeight;
    let leftMove;
    let topMove;
    let leftPos = this.left - width;
    let topPos = this.top;
    if (leftPos < 10) {
      leftPos = 10;
      leftMove = true;
    }
    if ((topPos + height + 10) > parentHeight) {
      topPos = parentHeight - height - 10;
      topMove = true;
    }

    if (leftMove && topMove) {
      topPos = this.top - height - 30;
    }

    this.element.style("top", topPos + "px");
    this.element.style("left", leftPos + "px");

    return this;
  }

  pin(arg) {
    if (this.hidden) return this;
    this.pinned = !this.pinned;
    if (arg != null) this.pinned = arg;
    this.element.select(".vzb-data-notes-close").classed("vzb-hidden", !this.pinned);
    this.element.classed("vzb-data-notes-pinned", this.pinned);
    this.element.select(".vzb-data-notes-body").node().scrollTop = 0;

    return this.showNotes ?
      this.setPos(this.left, this.top, true) :
      this.hide();
  }

  toggle(arg) {
    if (this.pinned) return this;
    if (arg == null) arg = !this.hidden;
    this.hidden = arg;
    this.element.classed("vzb-hidden", this.hidden || !this.showNotes);
    return this;
  }

  show() {
    return this.toggle(false);
  }

  hide() {
    return this.toggle(true);
  }

  close() {
    if (!this.hidden) {
      this.pin(false).hide();
    }
  }  

}
