import BaseService from "./base-service.js";
import { observable, action, decorate } from "mobx";
import { STATUS } from "../utils.js";

const PROFILES = {
  SMALL: {
    description: "small layout profile - a phone usually",
    min_width: 1,
    min_height: 1
  },
  MEDIUM: {
    description: "medium layout profile - a tablet usually",
    min_width: 600,
    min_height: 400
  },
  LARGE: {
    description: "large layout profile - a desktop usually",
    min_width: 900,
    min_height: 520
  }
};

class LayoutService extends BaseService {

  setup(){
    this.name = "layout";
    this.status = STATUS.READY;
    this.width = 1;
    this.height = 1;
    this.profile = "SMALL";
    this.resizeHandler();
    window.addEventListener("resize", this.resizeHandler.bind(this));
  }

  resizeHandler(){
    action(()=>{
      const view = d3.select(this.model.placeholder || "body").node();
      this.width = view.clientWidth;
      this.height = view.clientHeight;
      this.profile = this.detectProfile(this.width, this.height);
      if (!this.profile) console.warn(`
        Placeholder ${this.model.placeholder || "body"} is too little: ${this.width} x ${this.height} px, 
        nothing should be rendered
      `);
    })();
  }
  
  detectProfile(w, h) {
    let profile = null;
    Object.keys(PROFILES).forEach(p => {
      if (h >= PROFILES[p].min_height && w >= PROFILES[p].min_width) profile = p;
    });
    return profile;
  }
}

export default decorate(LayoutService, {
  "profile": observable,
  "status": observable
});