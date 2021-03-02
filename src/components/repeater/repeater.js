import * as utils from "../../legacy/base/utils";
import { ui } from "../../ui";
import {BaseComponent} from "../base-component.js";
import "./repeater.scss";

export class Repeater extends BaseComponent {
  constructor(config) {
    const repeat = config.model.encoding.get("repeat");

    const {
      COMP_CSSNAME,
      COMP_TYPE
    } = config.options;
    const templateArray  = [];
    const subcomponents = [];

    const lastRowIndex = repeat.row.length - 1;
    const lastColumnIndex = repeat.column.length - 1;
    repeat.row.forEach((row, i) => {
      repeat.column.forEach((column, j) => {
        const classed = (i !== lastRowIndex ? "vzb-sm-axis-x-elements-hidden " : "") +
          (j !== 0 ? "vzb-sm-axis-y-elements-hidden " : "") +
          ((j === lastColumnIndex && i === lastRowIndex) ? "vzb-sm-last-chart" : "");
        templateArray.push(
          '<div class="' + COMP_CSSNAME + ' ' + COMP_CSSNAME + subcomponents.length + ' vzb-sm-chart ' + classed + '"></div>'
        )

        const subcompName = config.name+i+"_"+j;
        const default_ui = ui(config.default_ui, config.ui);
        delete default_ui[subcompName];

        subcomponents.push({
          type: COMP_TYPE,
          placeholder: "." + COMP_CSSNAME + subcomponents.length,
          model: config.model,
          name: subcompName,
          state: {
            alias: {
              x: column,
              y: row
            }
          },
          default_ui: default_ui
        });
      });
    });

    config.subcomponents = subcomponents;
    config.template = templateArray.join("\n");

    super(config);
  }

  loading() {
    const repeat = this.model.encoding.get("repeat");
    this.element.style("grid-template-columns", Array(repeat.column.length).fill("1fr").join(" "));
  }
}

Repeater.DEFAULT_UI = {
}
