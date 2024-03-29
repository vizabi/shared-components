import { BaseService } from "./base-service.js";
import { observable, action, decorate, autorun, computed } from "mobx";
import { STATUS } from "../utils.js";
import * as utils from "../legacy/base/utils";
import * as d3 from "d3";

const PROFILES = [
  {
    id: "LARGE",
    min_width: 900,
    min_height: 520
  },
  {
    id: "MEDIUM",
    min_width: 600,
    min_height: 400
  },
  {
    id: "SMALL",
    min_width: 1,
    min_height: 1
  }
];

const CSS_PLACEHOLDER_CLASS = "vzb-tool";
const CSS_CLASS_PREFIX = "vzb-";
const CSS_LANDSCAPE_CLASS = "vzb-landscape";
const CSS_PORTRAIT_CLASS = "vzb-portrait";
const CSS_PROJECTOR_CLASS = "vzb-presentation";

class _LayoutService extends BaseService {

  static DEFAULTS = {
    projector: false,
    placeholder: "body"
  }

  setup(){
    this.name = "layout";
    this.status = STATUS.INIT;
    this.width = 1;
    this.height = 1;
    this.size = this.getSize();
    this.profile = "SMALL";
    this.placeholder = this.config.placeholder || this.constructor.DEFAULTS.placeholder;
    this.hGrid = [];
    this.element = d3.select(this.placeholder)
      .classed(CSS_PLACEHOLDER_CLASS, true);
    this._resizeHandler();

    const resizeHandler = this._resizeHandler.bind(this);
    window.addEventListener("resize", resizeHandler);
    this.removeListener = function() {
      window.removeEventListener("resize", resizeHandler);
    };

    this.removeProjectorListener = autorun(() => {
      this.setProjector.bind(this)();
    }, {name: "Layout.js: setProjector()"});
  }

  deconstruct(){
    this.removeProjectorListener();
    this.removeListener();
    super.deconstruct();
  }

  get projector() {
    return this.config.projector || this.constructor.DEFAULTS.projector;
  }

  set projector(projector) {
    this.config.projector = projector;
  }

  getSize() {
    const { width, height } = this;
    return { width, height };
  }

  _resizeHandler(){
    action("Layout.js: _resizeHandler()", ()=>{
      this.width = this.element.node().clientWidth;
      this.height = this.element.node().clientHeight;
      const profile = PROFILES.find(p => (this.width >= p.min_width && this.height >= p.min_height));

      if (!profile) {
        this.profile = "SMALL";
        this.status = STATUS.ERROR;
        console.warn(`
          Layout service: nothing should be rendered, because
          placeholder ${this.placeholder} has display:none or is too little: ${this.width} x ${this.height} px
        `);
      } else {
        this.element.classed(CSS_CLASS_PREFIX + this.profile.toLowerCase(), false);
        this.profile = profile.id;
        this.element.classed(CSS_CLASS_PREFIX + this.profile.toLowerCase(), true);
        this.element.classed(CSS_LANDSCAPE_CLASS, this.width > this.height);
        this.element.classed(CSS_PORTRAIT_CLASS, !(this.width > this.height));
        
        this.status = STATUS.READY;
      }
      this.size = this.getSize();
    })();
  }

  getProfileConstants(normalConstants = {}, forProjector = {}, positionInFacet){
    const result = this.projector
      ? utils.deepExtend({}, normalConstants[this.profile] || {}, forProjector[this.profile] || {})
      : utils.deepExtend({}, normalConstants[this.profile] || {});
    if(positionInFacet){
      if(!positionInFacet.row.first) result.margin.top = (result.margin.betweenRow * 0.5) || 2;
      if(!positionInFacet.row.last) result.margin.bottom = (result.margin.betweenRow * 0.5) || 2;
      if(!positionInFacet.column.first) result.margin.left = (result.margin.betweenColumn * 0.5) || 2;
      if(!positionInFacet.column.last) result.margin.right = (result.margin.betweenColumn * 0.5) || 2;
    }
    return result;
  }

  setProjector() {
    this.element.classed(CSS_PROJECTOR_CLASS, this.projector);
    this.size = this.getSize();
  }

  setHGrid(value) {
    action(() => {
      this.hGrid = value;
    })();
  }
}

export const LayoutService = decorate(_LayoutService, {
  "size": observable.ref, //reference watches when new object is created
  "hGrid": observable,
  "projector": computed,
  "width": observable,
  "height": observable,
  "profile": observable,
  "status": observable
});