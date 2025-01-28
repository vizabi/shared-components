import { BaseComponent } from "../../base-component.js";


export class ShortcutForSwitch extends BaseComponent {

  constructor(config) {
    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM = {
      container: this.element
    };
  }
  
  draw() {
    this.addReaction(this.updateList);
  }

  updateList(){
    const enabled = this.parent.ui?.shortcutForSwitch;
    if(!enabled) return this.DOM.container.style("display", "none");
    
    const whitelistConcepts = this.parent.ui?.shortcutForSwitch_allow;

    const switchSection = this.parent.children.find(f => f.constructor.name === "SectionSwitch");

    const items = switchSection.items
      .filter(f => !whitelistConcepts || whitelistConcepts.includes(f.concept))
      .toSorted((a,b) => a.name < b.name ? -1 : 1);
    
    const isCurrentSetting = switchSection.isCurrentSetting.bind(switchSection);
    const setFilter = switchSection.setFilter.bind(switchSection);

    this.DOM.container
      .style("display", items.length ? "block" : "none")
      .selectAll("span")
      .data(items)
      .join("span")
      .classed("vzb-active", d => isCurrentSetting(d))
      .text(d => d.name)
      .on("click", (event, d) => setFilter(d));
  }

}
