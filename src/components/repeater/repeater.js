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
    const default_ui = utils.deepExtend({}, config.default_ui);

    repeat.row.forEach((row, i) => {
      repeat.column.forEach((column, j) => {
        templateArray.push(
          '<div class="' + COMP_CSSNAME + ' ' + COMP_CSSNAME + subcomponents.length + '"></div>'
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
          superUI: config.ui
        });
        config.default_ui["chart"+i+"_"+j] = default_ui;
      });
    });

    config.subcomponents = subcomponents;
    config.template = templateArray.join("\n");
    //config.default_ui = default_ui;

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

    this.ui.viewWH = { 
      width: this.elementWidth / repeat.column.length,
      height: this.elementHeight / repeat.row.length
    };

  }
}

Repeater.DEFAULT_UI = {
  viewWH: {}
}
