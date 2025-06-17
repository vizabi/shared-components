import { BaseComponent } from "../base-component.js";
import {decorate, computed} from "mobx";
import { ICON_CLOSE as iconClose } from "../../../icons/iconset";
import "./marker-contextmenu.scss";


class MarkerContextmenu extends BaseComponent {

  constructor(config) {
    config.subcomponents = [];

    config.template = `
      <div class="vzb-mkcm-container">
        <div class="vzb-find-context-dialog-title"></div>
        <div class="vzb-find-context-dialog-close"></div>
      </div>

    `;
    super(config);
  }


  setup() {
    this.DOM = {
      container: this.element.select(".vzb-mkcm-container"),
      title: this.DOM.contextDialog.select(".vzb-find-context-dialog-title"),
      closecross: this.DOM.contextDialog.select(".vzb-find-context-dialog-close")
    };


    this.DOM.closecross
      .html(iconClose)
      .on("click", () => this.hide());

    this.hide();

  }

  hide(){
    this.element.classed("vzb-hidden", true);
  }

  show(d, xy = {x: 0, y: 0}){
    this.element.classed("vzb-hidden", false)
      .style("top", xy.y + "px")
      .style("left", xy.x + "px")

    this.DOM.container.text(d)
  }




  _updateContextDialogUiStrings(name, nameFold, nameExplode) {
    const t = this.localise;
    this.DOM.contextDialogTitle.text(name);
    this.DOM.fold.text("❇️ " + t("dialogs/find/fold") + " " + nameFold);
    this.DOM.explode.text("✳️ " + t("dialogs/find/explode") + " " + nameExplode);
  }

  _closeContextDialog() {
    this._contextDialogDatum && this.setModel.unhighlight(this._contextDialogDatum);
    this._contextDialogDatum = null;
    this.DOM.contextDialog.classed("vzb-hidden", true);
  }

  _bindContextDialogItems(d) {

    // ADD FOLD AND EXPLODE 
    
    //const _this = this;
    this._contextDialogDatum = d;
    const drilldownProps = this._getDrilldownProps();
    const index = drilldownProps.indexOf(d.prop);
    const propNames = [drilldownProps[index - 1], drilldownProps[index + 1]].map(prop => prop ? this.model.data.source.getConcept(prop)?.name : null);
    
    this._updateContextDialogUiStrings(d.name, propNames[0], propNames[1]);

    this.DOM.fold
      .classed("vzb-hidden", () => this._interact().disableFold(d))
      .on("click", () => {
        this._interact().clickToFold(d);
        this._closeContextDialog();
      });

    this.DOM.explode
      .classed("vzb-hidden", () => this._interact().disableExplode(d))
      .on("click", () => {
        this._interact().clickToExplode(d);
        this._closeContextDialog();
      });

  }

}


const decorated = decorate(MarkerContextmenu, {
});
export { decorated as MarkerContextmenu };