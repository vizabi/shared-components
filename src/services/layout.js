import BaseService from "./base-service.js";
import { observable, action, decorate } from "mobx";
import { STATUS } from "../utils.js";

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

class LayoutService extends BaseService {

  setup(){
    this.name = "layout";
    this.status = STATUS.INIT;
    this.width = 1;
    this.height = 1;
    this.profile = "SMALL";
    this.projector = false;
    this.element = d3.select(this.model.placeholder || "body")
      .classed(CSS_PLACEHOLDER_CLASS, true);
    this._resizeHandler();
    window.addEventListener("resize", this._resizeHandler.bind(this));
  }

  _resizeHandler(){
    action(()=>{
      this.width = this.element.node().clientWidth;
      this.height = this.element.node().clientHeight;
      
      const profile = PROFILES.find(p => (this.width >= p.min_width && this.height >= p.min_height));

      if (!profile) {
        this.profile = "SMALL";
        this.status = STATUS.ERROR;
        console.warn(`
          Layout service: nothing should be rendered, because
          placeholder ${this.model.placeholder || "body"} has display:none or is too little: ${this.width} x ${this.height} px
        `);
      } else {
        this.element.classed(CSS_CLASS_PREFIX + this.profile.toLowerCase(), false);
        this.profile = profile.id;
        this.element.classed(CSS_CLASS_PREFIX + this.profile.toLowerCase(), true);
        this.element.classed(CSS_LANDSCAPE_CLASS, this.width > this.height);
        this.element.classed(CSS_PORTRAIT_CLASS, !(this.width > this.height));
        
        this.status = STATUS.READY;
      }
    })();
  }

  getProfileConstants(normalConstants = {}, forProjector = {}){
    if (!this.projector) 
      return normalConstants[this.profile] || {};
    else
      return Object.assign({}, normalConstants[this.profile] || {}, forProjector[this.profile] || {});
  }
}

export default decorate(LayoutService, {
  "projector": observable,
  "width": observable,
  "height": observable,
  "profile": observable,
  "status": observable
});