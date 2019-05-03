import BaseComponent from "../base-component.js";
import PlayButton from "./play-button.js";
import "./time-slider.scss";

export default class TimeSlider extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: PlayButton,
      placeholder: ".vzb-ts-playbutton",
      //model: this.model
    }];

    config.template = `
      <div class="vzb-ts-playbutton"></div>
      <div class="vzb-ts-slider"></div>
    `;
    super(config);
  }

  setup() {
    this.sliderEL = this.view.select(".vzb-ts-slider");
  }

  draw() {
    this.sliderEL.text(JSON.stringify(this.model.encoding.get("frame").value));
  }
}  



