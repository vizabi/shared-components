import BaseComponent from "../base-component.js";

export default class PlayButton extends BaseComponent {

  constructor(config){
    config.template = `<button class="vzb-playbutton"></button>`;
    super(config);
  }

  setup() {
    this.buttonEl = this.element.select(".vzb-playbutton")
      .on("click", () => {this.model.encoding.get("frame").togglePlaying();});
  }

  draw() {
    const localise = this.services.locale.auto();
    this.buttonEl.text(this.model.encoding.get("frame").playing ? localise("button-pause") : localise("button-play"));
  }
}  
