import { transform, deepExtend } from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import "./stepped-slider.scss";
import { computed, decorate } from "mobx";

const CONFIG = {
  triangleWidth: 10,
  triangleHeight: 10,
  height: 31,
  lineWidth: 10,
  domain: [1, 2, 3, 4, 5, 6],
  range: [1200, 900, 450, 200, 150, 100]
};

class SteppedSlider extends BaseComponent {

  constructor(config) {
    config.template = `
      <div class="vzb-stepped-slider">
        <svg>
          <g class="vzb-stepped-slider-triangle"></g>
          <g class="vzb-stepped-slider-axis"></g>
        </svg>
      </div>`;

    super(config);
  }

  setup() {
    //this.setDelay = throttle(this.setDelay, 50);
    this.config = deepExtend(deepExtend({}, CONFIG), this.config);
    this.config.height -= this.config.triangleHeight / 2;
  
    const {
      domain,
      range,
      height
    } = this.config;

    this.DOM = {
      svg: this.element.select("svg"),
      slide: this.element.select(".vzb-stepped-slider-triangle")
    };

    this.axisScale = d3.scaleLog()
      .domain(d3.extent(domain))
      .range([height, 0]);

    this.delayScale = d3.scaleLinear()
      .domain(domain)
      .range(range);

    this.initTriangle();
    this.initAxis();

  }

  draw() {
    this.addReaction(this.redraw);
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame
    };
  }

  initAxis() {
    const {
      lineWidth,
      triangleWidth,
      triangleHeight,
      height
    } = this.config;

    const axis = d3.axisLeft()
      .scale(this.axisScale)
      .tickFormat(() => "")
      .tickSizeInner(lineWidth)
      .tickSizeOuter(0);

    const tx = triangleWidth + lineWidth / 2;
    const ty = triangleHeight / 2;
    this.DOM.svg
      .on("mousedown", event => {
        const y = Math.max(0, Math.min(event.offsetY - ty, height));

        this.setDelay(Math.round(this.delayScale(this.axisScale.invert(y))), true, true);
      })
      .select(".vzb-stepped-slider-axis")
      .attr("transform", `translate(${tx}, ${ty})`)
      .call(axis);

    this.drag = d3.drag()
      .on("drag", event => {
        const { translateY } = transform(this.DOM.slide.node());
        const y = Math.max(0, Math.min(event.dy + translateY, height));

        this.setDelay(Math.round(this.delayScale(this.axisScale.invert(y))), true);
        //this.redraw(y);
      })
      .on("end", () => {
        this.setDelay(this.MDL.frame.speed);
      });

    this.DOM.svg.call(this.drag);
  }

  initTriangle() {
    this.DOM.slide
      .append("g")
      .append("path")
      .attr("d", this.getTrianglePath());
  }

  getTrianglePath() {
    const {
      triangleHeight,
      triangleWidth
    } = this.config;

    return `M ${triangleWidth},${triangleHeight / 2} 0,${triangleHeight} 0,0 z`;
  }

  redraw() {
    const y = this.axisScale(this.delayScale.invert(this.MDL.frame.speed));
    this.DOM.slide.attr("transform", `translate(0, ${y})`);
  }

  setDelay(value) {
    this.MDL.frame.setSpeed(value);
  }

}

const decorated = decorate(SteppedSlider, {
  "MDL": computed
});
export { decorated as SteppedSlider };
