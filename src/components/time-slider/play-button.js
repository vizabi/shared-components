import BaseComponent from "../base-component.js";

export default class PlayButton extends BaseComponent {

  constructor(config){
    config.template = `<button class="vzb-playbutton"></button>`;
    super(config);
  }

  setup() {
    this.buttonEl = this.view.select(".vzb-playbutton")
      .on("click", () => {this.model.encoding.get("frame").togglePlaying();});
  }

  draw() {
    this.buttonEl.text(this.model.encoding.get("frame").playing ? "Pause" : "Play");
    console.log(this.services.layout.layoutModel.width);
  }
}  
