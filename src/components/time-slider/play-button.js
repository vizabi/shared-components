import BaseComponent from "../base-component.js";


export default function PlayButton(config){

  config.template = `<button class="vzb-playbutton"></button>`;
  const base = BaseComponent(config);

  let buttonEl = null;

  function setup() {
    buttonEl = base.view.select(".vzb-playbutton")
      .on("click", () => {base.encoding.get("frame").togglePlaying();});
  }

  function draw() {
    buttonEl.text(base.encoding.get("frame").playing ? "Pause" : "Play");
    console.log(base.services.layout.layoutModel.width);
  }

  return Object.assign({}, base, {
    setup,
    draw
  });
}

