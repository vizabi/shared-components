import { BaseComponent } from "../../base-component.js";

export class MarkerControlsSection extends BaseComponent {
  constructor(config) {
    config.template = `
      <div class = "vzb-header">
        <span class = "vzb-back">⬅</span>
        <span class = "vzb-title"></span>
        <span class = "vzb-threedots"></span>
        <span class = "vzb-enterhint"></span>
      </div>
      <div class = "vzb-content"></div>

    `;
    super(config);
    this.magicCommand = this.constructor.name.replace("_","").replace("Section","").toLowerCase();
  }

  setup() {
    this.DOM = {
      header: this.element.select(".vzb-header"),
      back: this.element.select(".vzb-back"),
      title: this.element.select(".vzb-title"),
      threedots: this.element.select(".vzb-threedots"),
      enterhint: this.element.select(".vzb-enterhint"),
      content: this.element.select(".vzb-content"),
    };

    this.DOM.back.on("click", () => this.cancelChanges());
  }

  example() {
    return "";
  }

  cancelChanges() {
    this.parent.toggleFullscreenish();
  }

  showHideHeader(showHide){
    this.DOM.header.classed("vzb-hidden", !showHide);
  }

  showHideSection(showHide) {
    this.element.classed("vzb-hidden", !showHide);
  }

  updateSearch() {
    console.warn("updateSearch(text) function is not implemented in " + this.constructor.name);
    this.showHideHeader();
  }

  concludeSearch() {
    console.warn("concludeSearch(text) function is not implemented in " + this.constructor.name);
  }


}
