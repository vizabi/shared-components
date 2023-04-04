import { ButtonList } from "../buttonlist";
import * as d3 from "d3";

/*!
 * VIZABI OPTIONSBUTTONLIST
 * Reusable optionsbuttonlist component
 */

//default existing buttons
const class_active = "vzb-active";
// var class_active_locked = "vzb-active-locked";
// var class_hide_btn = "vzb-dialog-side-btn";
// var class_unavailable = "vzb-unavailable";
// var class_vzb_fullscreen = "vzb-force-fullscreen";
// var class_container_fullscreen = "vzb-container-fullscreen";


export class OptionsButtonList extends ButtonList {
  setup() {
    super.setup();
    Object.keys(this._available_buttons).forEach(buttonId => {
      const button = this._available_buttons[buttonId];
      button.required = !button.required;
    });

  }

  draw() {
    super.draw();

    const buttonList = this.root.findChild({ name: "buttons" });
    buttonList.element.on("custom-togglebuttons", (event) => {
      const { hiddenButtons } = event.detail;
      this.element.selectAll(".vzb-buttonlist-btn")
        .style("display", d => hiddenButtons.indexOf(d.id) == -1 ? "none" : "");
    });
  }

  _toggleButtons() {

  }
}
