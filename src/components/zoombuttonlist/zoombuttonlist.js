import * as utils from "../../legacy/base/utils";
import * as iconset from "../../icons/iconset";
import { BaseComponent } from "../base-component";

/*!
 * VIZABI ZOOMBUTTONLIST
 * Reusable zoombuttonlist component
 */

//default existing buttons
const class_active = "vzb-active";
// var class_active_locked = "vzb-active-locked";
// var class_hide_btn = "vzb-dialog-side-btn";
// var class_unavailable = "vzb-unavailable";
// var class_vzb_fullscreen = "vzb-force-fullscreen";
// var class_container_fullscreen = "vzb-container-fullscreen";

export class ZoomButtonList extends BaseComponent {
  constructor(config) {

    super(config);
  } 

  setup() {

    this._available_buttons = {
      "arrow": {
        title: "buttons/cursorarrow",
        icon: "cursorArrow",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "root.ui.chart.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "plus": {
        title: "buttons/cursorplus",
        icon: "cursorPlus",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "root.ui.chart.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "minus": {
        title: "buttons/cursorminus",
        icon: "cursorMinus",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "root.ui.chart.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "hand": {
        title: "buttons/cursorhand",
        icon: "cursorHand",
        func: this.toggleCursorMode.bind(this),
        required: true,
        hide: "root.ui.chart.panWithArrow",
        statebind: "root.ui.chart.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "hundredpercent": {
        title: "buttons/hundredpercent",
        icon: "hundredPercent",
        func: this.toggleHundredPercent.bind(this),
        required: true
        // ,
        // statebind: "ui.chart.trails",
        // statebindfunc: this.setBubbleTrails.bind(this)
      }
    };  
  }

  draw() {

    this.localise = this.services.locale.auto();

    Object.keys(this._available_buttons).forEach(buttonId => {
      const button = this._available_buttons[buttonId];
      if (button && button.statebind) {
        this.addReaction(() => {
          button.statebindfunc(buttonId, utils.getProp(this, button.statebind.split(".")));
        });
      }
    });

    this._addButtons(Object.keys(this._available_buttons), []);
    this.addReaction(this.updateHiding);
  }

  updateHiding(){
    this.element.selectAll("button")
      .classed("vzb-hidden", d => d.hide && utils.getProp(this, d.hide.split(".")) );
  }

  /*
   * adds buttons configuration to the components and template_data
   * @param {Array} button_list list of buttons to be added
   */
  _addButtons(button_list, button_expand) {
    const _this = this;
    this._components_config = [];
    const details_btns = [];
    if (!button_list.length) return;
    //add a component for each button
    for (let i = 0; i < button_list.length; i++) {

      const btn = button_list[i];
      const btn_config = this._available_buttons[btn];

      //add template data
      const d = (btn_config) ? btn : "_default";
      const details_btn = utils.clone(this._available_buttons[d]);
      if (d == "_default") {
        details_btn.title = "buttons/" + btn;
      }
      details_btn.id = btn;
      details_btn.icon = iconset["ICON_" + details_btn.icon.toUpperCase()];
      details_btns.push(details_btn);
    }

    const t = this.localise;

    this.element.selectAll("button").data(details_btns)
      .enter().append("button")
      .attr("class", d => {
        let cls = "vzb-buttonlist-btn";
        if (button_expand.length > 0) {
          if (button_expand.indexOf(d.id) > -1) {
            cls += " vzb-dialog-side-btn";
          }
        }

        return cls;
      })
      .attr("data-btn", d => d.id)
      .html(btn => "<span class='vzb-buttonlist-btn-icon fa'>" +
          btn.icon + "</span><span class='vzb-buttonlist-btn-title'>" +
          t(btn.title) + "</span>");

    const buttons = this.element.selectAll(".vzb-buttonlist-btn");

    //clicking the button
    buttons.on("click", function(event, d) {

      event.preventDefault();
      event.stopPropagation();

      _this.proceedClick(d.id);
    });
    
  }

  proceedClick(id) {
    const _this = this;
    const btn = _this.element.selectAll(".vzb-buttonlist-btn[data-btn='" + id + "']");
    const classes = btn.attr("class");
    const btn_config = _this._available_buttons[id];

    if (btn_config && btn_config.func) {
      btn_config.func(id);
    } else {
      const btn_active = classes.indexOf(class_active) === -1;

      btn.classed(class_active, btn_active);
      const evt = {};
      evt["id"] = id;
      evt["active"] = btn_active;
      _this.trigger("click", evt);
    }
  }

  setButtonActive(id, boolActive) {
    const btn = this.element.selectAll(".vzb-buttonlist-btn[data-btn='" + id + "']");

    btn.classed(class_active, boolActive);
  }

  toggleCursorMode(id) {
    const value = id;
    this.root.ui.chart.cursorMode = value;
  }

  setCursorMode(id, value) {
    //const value = this.model.ui.cursorMode ? this.model.ui.cursorMode : "arrow";
    this.element.selectAll(".vzb-buttonlist-btn")
      .classed(class_active, d => d.id == value);
  }

  toggleHundredPercent() {
    this.root.element.dispatch("custom-resetZoom");
  }

}
