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
      fold: this.element.select(".vzb-marker-contextmenu-item-fold")
    };


    this.DOM.contextDialog;
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
      .style("left", xy.x + "px");
  }

  _updateContextDialogUiStrings(name, nameFold) {
    const t = this.localise;
    this.DOM.title.text(name);
    this.DOM.fold.text("❇️ " + t("dialogs/find/fold") + " " + nameFold);
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
      const foldPropName = [drilldownProps[index - 1]].map(prop => prop ? this.model.data.source.getConcept(prop)?.name : null)[0];
      
      this._updateContextDialogUiStrings(d.name, foldPropName);

      this.DOM.fold
        .classed("vzb-hidden", () => this._interact().disableFold(d))
        .on("click", () => {
          this._interact().clickToFold(d);
          this.hide();
        });

      this.DOM.container.selectAll(".vzb-marker-contextmenu-item-explode").remove();
      this.DOM.container.selectAll(".vzb-marker-contextmenu-item-explode").data(this._getExplodeProps(d))
        .join("div")
        .classed("vzb-marker-contextmenu-item vzb-marker-contextmenu-item-explode vzb-clickable", true)
        .text(d => "✳️ " + this.localise("dialogs/find/explode") + " " + d.explodePropName)
        .on("click", (event, d) => {
          this._interact().clickToExplode(d);
          this.hide();
        });
    });
  }

  _getExplodeProps(d) {
    const drilldownProps = this._getDrilldownProps();
    const index = drilldownProps.indexOf(d.prop);
    return index == -1 ? [] : drilldownProps.slice(index + 1).map(prop => {
      return ({
        [KEY]: d[KEY],
        prop: d.prop,
        explodeProp: prop,
        explodePropName: this.model.data.source.getConcept(prop)?.name || prop
      });
    } 
    );
  }

  _interact() {
    const _this = this;

    return {
      disableFold(d) {
        const drilldownProps = _this._getDrilldownProps();
        const index = drilldownProps.indexOf(d.prop);
        return drilldownProps[index - 1] ? false : true;
      },
      clickToExplode(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const explodeProp = d.explodeProp;

        const prevProp = drilldownProps[drilldownProps.indexOf(prop) - 1];
        const nextProp = drilldownProps[drilldownProps.indexOf(prop) + 1];
        const explodeNextProp = drilldownProps[drilldownProps.indexOf(explodeProp) + 1];
        if (!prevProp) {
          _this.model.data.source.drilldown({dim, entity: d[KEY]}).then(drilldown => {
            runInAction(() => {
              if (nextProp == explodeProp) {
                _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + explodeNextProp, prop: nextProp, key: drilldown[nextProp]});
                _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + explodeNextProp, prop: nextProp, key: drilldown[nextProp]});
              } else {
                _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + nextProp, prop: nextProp, key: drilldown[nextProp]});
                _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + nextProp, prop: nextProp, key: drilldown[nextProp]});
              }

              _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop: nextProp, key: drilldown[nextProp]});
              _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop: nextProp, key: drilldown[nextProp]});

              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
            });
          });
        } else {
          runInAction(() => {
            _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop, key: d[KEY]});
            _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + explodeProp, prop, key: d[KEY]});

            _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
            _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop, key: d[KEY]});
          });
        }
      },
      clickToFold(d) {
        const dim = _this._getPrimaryDim();
        const prop = d.prop;
        const drilldownProps = _this._getDrilldownProps();
        const foldProp = drilldownProps[drilldownProps.indexOf(prop) - 1];
        const foldValue = d[foldProp];
        const nextProp = drilldownProps[drilldownProps.indexOf(prop) + 1];

        if (nextProp) {
          _this.model.data.source.drilldown({dim, entity: foldValue}).then(drilldown => {
            runInAction(() => {
              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + nextProp, prop: prop, key: drilldown[prop]});
              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + nextProp, prop: prop, key: drilldown[prop]});

              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: prop, key: drilldown[prop]});
              _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: prop, key: drilldown[prop]});

              _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
              _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
            });
          });
        } else {
          runInAction(() => {
            _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: foldProp, key: foldValue});
            _this.model.data.filter.deleteUsingLimitedStructure({dim, isness: "is--" + prop, prop: foldProp, key: foldValue});

            _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
            _this.model.data.filter.addUsingLimitedStructure({dim, isness: "is--" + foldProp, prop: foldProp, key: foldValue});
          });
        }
      }
    };
  }
}

MarkerContextmenu.DEFAULT_UI = {
  "primaryDim": "",
  "drilldown": ""
};

const decorated = decorate(MarkerContextmenu, {
});
export { decorated as MarkerContextmenu };