import * as utils from "../../../legacy/base/utils";
import { Dialog } from "../dialog";
import { OptionsButtonList } from "../../buttonlist/optionsbuttonlist/optionsbuttonlist";

/*
 * More options dialog
 */

export class MoreOptions extends Dialog {
  constructor(config) {
    const { moreoptions = [], popup = []} = config.parent.ui.dialogs;
    const templateArray  = [];
    const subcomponents = [{
      type: OptionsButtonList,
      placeholder: ".vzb-dialog-options-buttonlist",
    }];

    const dialogList = moreoptions === true ? popup : moreoptions;

    dialogList.forEach(dlg => {      
      subcomponents.push({
        type: Dialog.get(dlg),
        placeholder: '.vzb-dialogs-dialog[data-dlg="' + dlg + '"]',
        model: config.model,
        name: dlg,
      });

      templateArray.push(
        `<div data-dlg="${dlg}" class="vzb-dialogs-dialog  vzb-moreoptions vzb-accordion-section"></div>`
      );
    });

    config.subcomponents = subcomponents;

    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="moreoptions" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="moreoptions" data-click="dragDialog"></span>

        <div class="vzb-dialog-title">
          <span></span>
        </div>

        <div class="vzb-dialog-content vzb-dialog-scrollable">
          <div class='vzb-dialog-options-buttonlist'>
          </div>
          <div class="vzb-accordion">
            ${templateArray.join("\n")}
          </div>
        </div>

        <div class="vzb-dialog-buttons">
          <div data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span></span>
          </div>
        </div>

      </div>
    `;

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.element.on("custom-dragend", () => {
      this._setMaxHeight();
    });

    const _this = this;
    this.DOM.accordion = this.DOM.content.select(".vzb-accordion");

    //accordion
    if (this.DOM.accordion) {
      const sections = this.DOM.accordion.selectAll(".vzb-accordion-section");
      sections.data(this.children.slice(1).map(c => ({ 
        name: c.name
      })));
      const titleEl = sections
        .select(".vzb-dialog-title>span:first-child");
      titleEl.on("click", d => {
        const sectionEl = _this.findChild({ name: d.name }).element;
        const activeEl = _this.DOM.accordion.select(".vzb-accordion-active");
        if (activeEl) {
          activeEl.classed("vzb-accordion-active", false);
        }
        if (sectionEl.node() !== activeEl.node()) {
          sectionEl.classed("vzb-accordion-active", true);
          _this.transitionEvents.forEach(event => {
            sectionEl.on(event, () => {
              _this.transitionEvents.forEach(event => {
                sectionEl.on(event, null);
              });
              //_this.components[d.component].trigger("resize");
            });
          });
        }
      });
    }
  }

  draw() {
    super.draw();

    this.DOM.title.select("span").text(this.localise("buttons/more_options"));
    this.DOM.buttons.select("span").text(this.localise("buttons/ok"));

  }
}

Dialog.add("moreoptions", MoreOptions);







const _MoreOptions = {

  /**
   * Initializes the dialog component
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, parent) {
    this.name = "moreoptions";

    //specifying components
    this.components = [{
      component: optionsbuttonlist,
      placeholder: ".vzb-dialog-options-buttonlist",
      model: ["state", "ui", "locale"]
    }];

    this._super(config, parent);
  },

  readyOnce() {
    this._super();

    const _this = this;
    this.DOM.accordion = this.contentEl.select(".vzb-accordion");

    this.on("dragend", () => {
      _this._setMaxHeight();
    });

    const dialog_popup = (this.model.ui.dialogs || {}).popup || [];
    let dialog_moreoptions = (this.model.ui.dialogs || {}).moreoptions || [];

    // if dialog_moreoptions has been passed in with boolean param or array must check and covert to array
    if (dialog_moreoptions === true) {
      dialog_moreoptions = dialog_popup;
      (this.model.ui.dialogs || {}).moreoptions = dialog_moreoptions;
    }

    this._addDialogs(dialog_moreoptions);

    //accordion
    if (this.DOM.accordion) {
      const titleEl = this.DOM.accordion.selectAll(".vzb-accordion-section")
        .select(".vzb-dialog-title>span:first-child");
      titleEl.on("click", d => {
        const element = _this.components[d.component].element;
        const sectionEl = _this.components[d.component].placeholderEl;
        const activeEl = _this.DOM.accordion.select(".vzb-accordion-active");
        if (activeEl) {
          activeEl.classed("vzb-accordion-active", false);
        }
        if (sectionEl.node() !== activeEl.node()) {
          sectionEl.classed("vzb-accordion-active", true);
          _this.transitionEvents.forEach(event => {
            sectionEl.on(event, () => {
              _this.transitionEvents.forEach(event => {
                sectionEl.on(event, null);
              });
              _this.components[d.component].trigger("resize");
            });
          });
        }
      });
    }
  },

  _addDialogs(dialog_list) {
    this._components_config = [];
    const details_dlgs = [];
    if (!dialog_list.length) return;
    //add a component for each dialog
    for (let i = 0; i < dialog_list.length; i++) {

      //check moreoptions in dialog.moreoptions
      if (dialog_list[i] === "moreoptions") continue;

      const dlg = dialog_list[i];
      const dlg_config = utils.deepClone(this.parent._available_dialogs[dlg]);

      //if it's a dialog, add component
      if (dlg_config && dlg_config.dialog) {
        const comps = this._components_config;

        //add corresponding component
        comps.push({
          component: dlg_config.dialog,
          placeholder: '.vzb-dialogs-dialog[data-dlg="' + dlg + '"]',
          model: ["state", "ui", "locale"]
        });

        dlg_config.component = comps.length - 1;

        dlg_config.id = dlg;
        details_dlgs.push(dlg_config);
      }
    }

    this.DOM.accordion.selectAll("div").data(details_dlgs)
      .enter().append("div")
      .attr("class", d => {
        const cls = "vzb-dialogs-dialog vzb-moreoptions vzb-accordion-section";
        return cls;
      })
      .attr("data-dlg", d => d.id);

    this.loadSubComponents();

    const _this = this;
    //render each subcomponent
    utils.forEach(this.components, subcomp => {
      subcomp.render();
      _this.on("resize", () => {
        subcomp.trigger("resize");
      });
    });
  }
};
