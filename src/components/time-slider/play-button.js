import BaseComponent from "../base-component.js";

const HTML_ICON_PLAY = 
  `<svg class="vzb-icon vzb-icon-play" viewBox="3 3 42 42"
  xmlns="http://www.w3.org/2000/svg">
  <path xmlns="http://www.w3.org/2000/svg" d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-4 29V15l12 9-12 9z"/>
  </svg>`;
const HTML_ICON_PAUSE =
  `<svg class="vzb-icon vzb-icon-pause" viewBox="3 3 42 42"
  xmlns="http://www.w3.org/2000/svg">
  <path xmlns="http://www.w3.org/2000/svg" d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-2 28h-4V16h4v16zm8 0h-4V16h4v16z"/>
  </svg>`;
const HTML_ICON_LOADING =
  `<div class='vzb-loader'></div>`

export default class PlayButton extends BaseComponent {

  constructor(config) {
    config.template = 
      `<button class="vzb-ts-btn">
        <div class='vzb-loader'></div>
      </button>`
    super(config);
  }

  setup() {
    this.buttonEl = this.element.select(".vzb-ts-btn")
      .on("click", () => {this.model.encoding.get("frame").togglePlaying();});
  }

  draw() {
    const localise = this.services.locale.auto();
    this.buttonEl.html(this.model.encoding.get("frame").playing ? HTML_ICON_PAUSE : HTML_ICON_PLAY);
//    this.buttonEl.text(this.model.encoding.get("frame").playing ? localise("button-pause") : localise("button-play"));
  }

  loading() {
    this.buttonEl.html(HTML_ICON_LOADING);
  }
}  
