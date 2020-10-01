import * as utils from "../../legacy/base/utils";
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
    const baseUI = config.baseUI;
    config.baseUI = {};

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
        subcomponents.push({
          type: COMP_TYPE,
          placeholder: "." + COMP_CSSNAME + subcomponents.length,
          model: config.model,
          name: "chart"+i+"_"+j,
          state: {
            alias: {
              x: column,
              y: row
            }
          },
          ui: config.ui,
        });
        config.baseUI["chart"+i+"_"+j] = baseUI;
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

  resize() {
    this.services.layout.size;

    const repeat = this.model.encoding.get("repeat");

    this.elementHeight = (this.element.node().clientHeight) || 0;
    this.elementWidth = (this.element.node().clientWidth) || 0;

    // this.ui.viewWH = { 
    //   width: this.elementWidth / repeat.column.length,
    //   height: this.elementHeight / repeat.row.length
    // };
    this.ui.viewWH.width = this.elementWidth / repeat.column.length,
    this.ui.viewWH.height = this.elementHeight / repeat.row.length

  }
}

Repeater.DEFAULT_UI = {
  viewWH: {
    width: 0,
    height: 0
  }
}
