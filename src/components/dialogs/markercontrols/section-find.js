import { MarkerControlsSection } from "./section.js";
import * as d3 from "d3";

export class SectionFind extends MarkerControlsSection {
  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.title.text("Find");
  }

  draw() {
  }

}
