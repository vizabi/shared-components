import { BaseComponent } from "../base-component";
import { decorate } from "mobx";
import * as d3 from "d3";

import "./addgeo.scss";
export class _AddGeo extends BaseComponent {

  constructor(config){
    config.template = `
      <div class="vzb-addgeo-button"></div>
      </div>
    `;
    config.subcomponents = [];
   
    super(config);
  }

  setup(options) {
    const _this = this;

    this.DOM = {
      button: this.element.select(".vzb-addgeo-button"),
    };

    this.DOM.button.on("click", () => {
      const markerControls = _this.root
        .findChild({name: "markercontrols"});
      if (!markerControls) return;      

      if ((_this.root.services.layout.profile !== "LARGE" || _this.root
        .findChild({name: "buttons"}).ui.sidebarCollapse) && !markerControls.isOpen)
      {
        markerControls.parent.toggleDialogOpen("markercontrols");
      }

      markerControls.element.select(".vzb-search").each(function() {
        this.value = "add ";
        this.dispatchEvent(new Event("input"));
        const _this = this;
        d3.select(this).style("background", "lightgreen")
          .transition().duration(1000).ease(d3.easeCubicOut)
          .style("background", "#fff");
        setTimeout(()=> {
          _this.setSelectionRange(_this.value.length, _this.value.length);
          _this.focus();
        }, 250);
      });
            
    });

    this.PROFILE_CONSTANTS = options.PROFILE_CONSTANTS;
    this.PROFILE_CONSTANTS_FOR_PROJECTOR = options.PROFILE_CONSTANTS_FOR_PROJECTOR;
    this.xAlign = options.xAlign;
    this.yAlign = options.yAlign;
  }

  draw(){
    this.localise = this.services.locale.auto();
    this.addReaction(this.updateSize);
    this.addReaction(this.redraw);
  }
  
  redraw(){
    this.DOM.button.text(this.localise("buttons/addgeo"));
  }


  updateSize() {
    this.services.layout.size; //watch

    this.profileConstants = this.services.layout.getProfileConstants(this.PROFILE_CONSTANTS, this.PROFILE_CONSTANTS_FOR_PROJECTOR);

    const {
      margin,
      dy,
      dx,
    } = this.profileConstants;

    this.element.style("top", this.yAlign == "top" ? margin.top + (dy||0) + "px" : null);
    this.element.style("bottom", this.yAlign == "bottom" ? margin.bottom + (dy||0) + "px" : null);
    this.element.style("left", this.xAlign == "left" ? margin.left + (dx||0) + "px" : null);
    this.element.style("right", this.xAlign == "right" ? margin.right + (dx||0) + "px" : null);
  }

}

export const AddGeo = decorate(_AddGeo, {
});