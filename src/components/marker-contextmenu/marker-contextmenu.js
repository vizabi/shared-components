import { BaseComponent } from "../base-component.js";
import { decorate, runInAction } from "mobx";
import { ICON_CLOSE as iconClose } from "../../icons/iconset.js";
import "./marker-contextmenu.scss";

const KEY = Symbol.for("key");

class MarkerContextmenu extends BaseComponent {

  constructor(config) {
    config.subcomponents = [];

    config.template = `
      <div class="vzb-mkcm-container">
        <div class="vzb-marker-contextmenu-title"></div>
        <div class="vzb-marker-contextmenu-item vzb-marker-contextmenu-item-fold vzb-clickable"></div>
        <div class="vzb-marker-contextmenu-item vzb-marker-contextmenu-item-explode vzb-clickable"></div>
        <div class="vzb-marker-contextmenu-close"></div>
      </div>
    `;
    super(config);
  }


  setup() {
    this.DOM = {
      container: this.element.select(".vzb-mkcm-container"),
      title: this.element.select(".vzb-marker-contextmenu-title"),
      closecross: this.element.select(".vzb-marker-contextmenu-close"),
      fold: this.element.select(".vzb-marker-contextmenu-item-fold"),
      explode: this.element.select(".vzb-marker-contextmenu-item-explode")
    };


 this.DOM.contextDialog
    this.element
      .on("mouseleave", () => {
        this.hide();
      })
      .on("contextmenu", (e) => {
        e.preventDefault();
      });
    this.DOM.closecross
      .html(iconClose)
      .on("click", () => this.hide());

    this.hide();

    //warm up drillcatalog
    this.model.data.source.enableDrillup = true;
  }

  draw() {
    this.localise = this.services.locale.auto();
  }

  hide(){
    this.element.classed("vzb-hidden", true);
  }

  show(d, xy = {x: 0, y: 0}){
    this._bindContextDialogItems(d);
    this.element.classed("vzb-hidden", false)
      .style("top", xy.y + "px")
      .style("left", xy.x + "px")
  }

  _updateContextDialogUiStrings(name, nameFold, nameExplode) {
    const t = this.localise;
    this.DOM.title.text(name);
    this.DOM.fold.text("❇️ " + t("dialogs/find/fold") + " " + nameFold);
    this.DOM.explode.text("✳️ " + t("dialogs/find/explode") + " " + nameExplode);
  }

  _getPrimaryDim() {
    return this.ui.primaryDim || this.model.data.space[0];
  }

  _getDrilldownProps() {
    return this.ui.drilldown?.split?.(".") || [];
  }

  _findDrillProps(d) {
    const dim = this._getPrimaryDim();
    return Promise.all([
      this.model.data.source.drillup({ dim, entity: d[KEY] }),
      this.model.data.source.drilldown({ dim, entity: d[KEY] }).then( drillDown => {
        return Object.keys(drillDown).find(prop => {
          return drillDown[prop].includes(d[KEY]);
        });
      })
    ]);
  }

  _bindContextDialogItems(_d) {

    // ADD FOLD AND EXPLODE 
    
    //const _this = this;
    this._findDrillProps(_d).then(props => {
      const d = Object.assign({}, _d, props[0]);
      d.prop = props[1];
      const drilldownProps = this._getDrilldownProps();
      const index = drilldownProps.indexOf(d.prop);
      const propNames = [drilldownProps[index - 1], drilldownProps[index + 1]].map(prop => prop ? this.model.data.source.getConcept(prop)?.name : null);
      
      this._updateContextDialogUiStrings(d.name, propNames[0], propNames[1]);

      this.DOM.fold
        .classed("vzb-hidden", () => this._interact().disableFold(d))
        .on("click", () => {
          this._interact().clickToFold(d);
          this.hide();
        });

      this.DOM.explode
        .classed("vzb-hidden", () => this._interact().disableExplode(d))
        .on("click", () => {
          this._interact().clickToExplode(d);
          this.hide();
        });
    });
  }

  _interact() {
    const _this = this;

    return {
      disableExplode(d) {
        const drilldownProps = _this._getDrilldownProps();
        const index = drilldownProps.indexOf(d.prop);
        return drilldownProps[index + 1] ? false : true;
      },
      disableFold(d) {
        const drilldownProps = _this._getDrilldownProps();
        const index = drilldownProps.indexOf(d.prop);
        return drilldownProps[index - 1] ? false : true;
      },
      clickToExplode(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const explodeProp = drilldownProps[drilldownProps.indexOf(prop) + 1];

        runInAction(() => {
          _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
          _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop, key: d[KEY]});
        })
      },
      clickToFold(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const foldProp = drilldownProps[drilldownProps.indexOf(prop) - 1];
        const foldValue = d[foldProp];
        
        runInAction(() => {
          _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: foldProp, key: foldValue});
          _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
        })
      }
    }
  }
}

MarkerContextmenu.DEFAULT_UI = {
  "primaryDim": "",
  "drilldown": ""
};

const decorated = decorate(MarkerContextmenu, {
});
export { decorated as MarkerContextmenu };