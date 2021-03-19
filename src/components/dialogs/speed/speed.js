import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";
import { SingleHandleSlider } from "../../brushslider/singlehandleslider/singlehandleslider";
import { SimpleCheckbox } from "../../simplecheckbox/simplecheckbox";
import {decorate, computed} from "mobx";

class Speed extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
            <span data-localise="buttons/time"></span>
        </div>
            
        <div class="vzb-dialog-content">
          <p class="vzb-dialog-sublabel">
            <span data-localise="hints/speed"></span>
          </p>
            
          <form class="vzb-dialog-paragraph">
            <div class="vzb-speed-slider"></div>
          </form>
          
          <p class="vzb-dialog-sublabel">
            <span data-localise="hints/forecastoptions"></span>
          </p>
          <form class="vzb-dialog-paragraph">
            <div class="vzb-showforecast-switch"></div>
            <div class="vzb-pausebeforeforecast-switch"></div>
            <div class="vzb-showstripedpatternwhenforecast-switch"></div>
            <div>
              <span data-localise="hints/endbeforeforecast"></span>
              <input type="text" class="vzb-endbeforeforecast-field" name="endbeforeforecast"/>
            </div>
            <div>
              <span class="vzb-timeformatexample-hint" data-localise="hints/timeformatexample"></span>
              <span class="vzb-timeformatexample-label"></span>
            </div>
          </form>
        </div>
      </div>  
    `;

    config.subcomponents = [{
      type: SingleHandleSlider,
      placeholder: ".vzb-speed-slider",
      //model: ["state.time", "locale"],
      options: {
        value: "speed",
        setValueFunc: "setSpeed",
        domain: [1200, 900, 450, 200, 150, 100],
        ROUND_DIGITS: 0
      },
      model: config.model.encoding.frame
      
    },{
      type: SimpleCheckbox,
      placeholder: ".vzb-showforecast-switch",
      //model: ["state.time", "locale"],
      options: {
        checkbox: "showForecast",
        submodel: "root.ui.chart"
      }
    },{
      type: SimpleCheckbox,
      placeholder: ".vzb-pausebeforeforecast-switch",
      //model: ["state.time", "locale"],
      options: {
        checkbox: "pauseBeforeForecast",
        submodel: "root.ui.chart",
      }
    },{
      type: SimpleCheckbox,
      placeholder: ".vzb-showstripedpatternwhenforecast-switch",
      //model: ["ui.chart", "locale"],
      options: {
        checkbox: "showForecastOverlay",
        submodel: "root.ui.chart"
      }
    }];

    super(config);
  }

  setup(options) {
    this.DOM = {
      timeFormatExample: this.element.select(".vzb-timeformatexample-label"),
      forecastField: this.element.select(".vzb-endbeforeforecast-field")
    }

    const _this = this;
    this.DOM.forecastField
      .on("keypress", function() {
        if (d3.event.charCode == 13 || d3.event.keyCode == 13) {
          //this prevents form submission action with subsequent page reload
          d3.event.preventDefault();
          this.blur();
        }
      })
      .on("change", function() {
        //TODO: where is time parser nowdays
        const parsed = new Date(this.value);
        if (utils.isDate(parsed)) {
          _this.MDL.frame.config.endBeforeForecast = parsed;
        }
      });

  }


  get MDL() {
    return {
      frame: this.model.encoding.frame
    };
  }

  draw() {

    this.localise = this.services.locale.auto();

    this.addReaction(this._updateView);
  }

  _updateView() {
    this.DOM.forecastField.property("value",
      this.localise(this.MDL.frame.config.endBeforeForecast)
    );
    this.DOM.timeFormatExample.text(this.localise(new Date()));
  }

}

const decorated = decorate(Speed, {
  "MDL": computed
});

Dialog.add("speed", decorated);
export { decorated as Speed};




const _Speed = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "speed";

    // in dialog, this.model_expects = ["state", "data"];

    this.components = [
      {
        component: singlehandleslider,
        placeholder: ".vzb-speed-slider",
        model: ["state.time", "locale"],
        arg: "delay",
        properties: {
          domain: [1200, 900, 450, 200, 150, 100],
          roundDigits: 0
        }
      },
      {
        component: simplecheckbox,
        placeholder: ".vzb-showforecast-switch",
        model: ["state.time", "locale"],
        checkbox: "showForecast"
      },
      {
        component: simplecheckbox,
        placeholder: ".vzb-pausebeforeforecast-switch",
        model: ["state.time", "locale"],
        checkbox: "pauseBeforeForecast"
      },
      {
        component: simplecheckbox,
        placeholder: ".vzb-showstripedpatternwhenforecast-switch",
        model: ["ui.chart", "locale"],
        checkbox: "showForecastOverlay"
      }
    ];

    this._super(config, parent);
  },

  readyOnce() {
    this._super();
    const _this = this;

    this.timeFormatExampleEl = this.element.select(".vzb-timeformatexample-label");

    this.forecastFieldEl = this.element.select(".vzb-endbeforeforecast-field")
      .on("keypress", function() {
        if (d3.event.charCode == 13 || d3.event.keyCode == 13) {
          //this prevents form submission action with subsequent page reload
          d3.event.preventDefault();
          this.blur();
        }
      })
      .on("change", function() {
        const parsed = _this.model.state.time.parse(this.value);
        if (utils.isDate(parsed)) {
          _this.model.state.time.endBeforeForecast = parsed;
        }
      });

    this.updateView();
  },

  updateView() {
    this.forecastFieldEl.property("value",
      this.model.state.time.formatDate(this.model.state.time.endBeforeForecast)
    );
    this.timeFormatExampleEl.text(this.model.state.time.formatDate(new Date()));
  }
}
