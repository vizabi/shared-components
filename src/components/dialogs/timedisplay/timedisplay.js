import { Dialog } from "../dialog";
import { DynamicBackground } from "../../dynamic-background/dynamic-background";
import {decorate, computed} from "mobx";

/*
 * Timedisplay dialog
 */
class TimeDisplay extends Dialog {
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
    super.setup(options);

    this._year = this.findChild({type: "DynamicBackground"});
    this._year.setConditions({ widthRatio: 1, heightRatio: 1 });
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame
    };
  }

  draw() {
    super.draw();

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
const decorated = decorate(TimeDisplay, {
  "MDL": computed
});
export { decorated as TimeDisplay };