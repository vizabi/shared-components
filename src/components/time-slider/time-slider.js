import BaseComponent from "../base-component.js";
import PlayButton from "./play-button.js";
import "./time-slider.scss";

export default class TimeSlider extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: PlayButton,
      placeholder: ".vzb-ts-btns",
      //model: this.model
    }];

    config.template = `
      <div class="vzb-ts-btns"></div>
      <div class="vzb-ts-slider"></div>
    `;
    super(config);
  }

  setup() {
    this.DOM = {
      slider: this.element.select(".vzb-ts-slider")
    };
  }

  draw() {
    const localise = this.services.locale.auto();
    this.DOM.slider.text(localise(this.model.encoding.get("frame").value));
  }
}  



