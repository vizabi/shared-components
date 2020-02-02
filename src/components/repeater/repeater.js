import * as utils from "../../legacy/base/utils";
import {BaseComponent} from "../base-component.js";

export class Repeater extends BaseComponent {
  constructor(config) {
    const repeat = config.model.encoding.get("repeat");

    const {
      COMP_CSSNAME,
      COMP_TYPE
    } = config.options;
    const templateArray  = [];
    const subcomponents = [];

    for (const row of repeat.row) {
      for (const column of repeat.column) {
        templateArray.push(
          '<div class="' + COMP_CSSNAME + ' ' + COMP_CSSNAME + subcomponents.length + '"></div>'
        )
        subcomponents.push({
          type: COMP_TYPE,
          placeholder: "." + COMP_CSSNAME + subcomponents.length,
          model: config.model,
          name: "chart",
          state: {
            alias: {
              x: column,
              y: row
            }
          }
        });
      }
    }

    config.subcomponents = subcomponents;
    config.template = templateArray.join("\n");
    super(config);
  }

  loading() {
    const repeat = this.model.encoding.get("repeat");
    this.element.style("grid-template-columns", Array(repeat.column.length).fill("1fr").join(" "));
  }
}