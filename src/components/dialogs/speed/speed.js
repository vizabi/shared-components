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

  setup() {
    this.DOM = {
      timeFormatExample: this.element.select(".vzb-timeformatexample-label"),
      forecastField: this.element.select(".vzb-endbeforeforecast-field")
    };

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
        const frame = _this.MDL.frame;
        const parsed = frame.parseValue(this.value);
        if (utils.isDate(parsed)) {
          _this.root.ui.chart.endBeforeForecast = this.value;
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
      this.localise(this.root.ui.chart.endBeforeForecast)
    );
    this.DOM.timeFormatExample.text(this.localise(new Date()));
  }

}

const decorated = decorate(Speed, {
  "MDL": computed
});

Dialog.add("speed", decorated);
export { decorated as Speed};
