import { ButtonList } from "../buttonlist";

/*!
 * VIZABI OPTIONSBUTTONLIST
 * Reusable optionsbuttonlist component
 */

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
