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
