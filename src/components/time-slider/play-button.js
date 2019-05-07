import BaseComponent from "../base-component.js";

export default class PlayButton extends BaseComponent {

  constructor(config){
    config.template = `<button class="vzb-playbutton"></button>`;
    super(config);
  }

  setup() {
    this.t = this.services.locale.getTFunction();
    this.buttonEl = this.view.select(".vzb-playbutton")
      .on("click", () => {this.model.encoding.get("frame").togglePlaying();});
  }

  draw() {
    if(this.state !== "ready") return;
    this.buttonEl.text(this.model.encoding.get("frame").playing ? this.t("button-pause") : this.t("button-play"));
    console.log(this.services.layout.layoutModel.width);
  }
}  
