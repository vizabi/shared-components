import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";
import { DynamicBackground } from "../../dynamic-background/dynamic-background";

/*
 * Timedisplay dialog
 */
export class TimeDisplay extends Dialog {
  constructor(config) {
    config.template = `
      <div class="vzb-dialog-modal">
        <div class="vzb-dialog-content vzb-dialog-content-fixed">
          <svg>
            <g class="vzb-timedisplay"></g>
          </svg>
        </div>
        <div class="vzb-dialog-buttons"></div>
      </div>`;
  
    config.subcomponents = [{
      type: DynamicBackground,
      placeholder: ".vzb-timedisplay"
    }];
    
    super(config);
  }

  setup(options) {
    super.setup();

    this._year = this.findChild({type: "DynamicBackground"});
    this._year.setConditions({ widthRatio: 1, heightRatio: 1 });
    
  }

  draw() {
    super.draw();

    this.MDL.frame = this.model.encoding.frame;

    const _this = this;
    Object.assign(this.state, {
      get duration() {
        return _this.MDL.frame.playing ? _this.MDL.frame.speed || 0 : 0;
      }
    });

    this.addReaction(this._updateTime);
    this.addReaction(this._updateSize);

  }

  _updateTime() {
    const frame = this.MDL.frame;
    this._year.setText(this.localise(frame.value), this.state.duration);
  }

  _updateSize() {
    this.services.layout.size;

    if (this._year) {
      this._year.resizeText(this.DOM.content.style("width"), this.DOM.content.style("height"));
    }
  }
}

Dialog.add("timedisplay", TimeDisplay);



const OldTimeDisplay = {

  init(config, parent) {
    this.name = "timedisplay";

    this.model_binds = {
      "change:state.time.value": () => {
        this.updateTime();
      }
    };

    this._super(config, parent);
  },

  ready() {
    this.updateTime();
  },

  readyOnce() {
    this._super();
    this.timeLabel = new DynamicBackground(this.element.select(".vzb-timedisplay"));
    this.timeLabel.setConditions({ widthRatio: 1, heightRatio: 1 });
    this.resize();
  },

  resize() {
    if (this.timeLabel) {
      this.timeLabel
        .resize(this.contentEl.style("width"), this.contentEl.style("height"));
    }
  },

  updateTime() {
    const timeMdl = this.model.state.time;
    this.time_1 = this.time == null ? timeMdl.value : this.time;
    this.time = timeMdl.value;
    const duration = timeMdl.playing && (this.time - this.time_1 > 0) ? timeMdl.delayAnimations : 0;
    this.timeLabel.setText(timeMdl.formatDate(this.time, "ui"), duration);
  }

};
