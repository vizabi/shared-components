import BaseService from "./base-service.js";
import { observable, action, decorate } from "mobx";

const PROFILES = {
  SMALL: {
    description: "small layout profile - a phone usually",
    min_width: 0,
    min_height: 0
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
    this.state = "ready";
    window.addEventListener("resize", this.resizeHandler.bind(this));
    this.layoutModel = {
      "width": 1,
      "height": 1,
      "profile": PROFILES.SMALL
    };
  }

  resizeHandler(){
    action(()=>{
      const view = d3.select("body").node();
      this.layoutModel.width = view.clientWidth;
      this.layoutModel.height = view.clientHeight;
    })();
  }
}

export default decorate(LayoutService, {
  "layoutModel": observable,
  "state": observable
});