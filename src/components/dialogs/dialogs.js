import { Dialog } from "./dialog";
import * as utils from "../../legacy/base/utils";
import { BaseComponent } from "../base-component";
import { runInAction } from "mobx";

/*!
 * VIZABI DIALOGS
 * Reusable dialogs component
 */

//default existing dialogs
const class_active = "vzb-active";

export class Dialogs extends BaseComponent {
  constructor(config) {
    const { sidebar = [], popup = []} = utils.deepExtend(utils.deepExtend({}, config.ui.dialogs), config.default_ui.dialogs);
    const subcomponents = [];
    const templateArray  = [];

    const dialogList = utils.unique([...sidebar, ...popup]);

    dialogList.forEach(dlg => {      
      subcomponents.push({
        type: Dialog.get(dlg),
        placeholder: '.vzb-dialogs-dialog[data-dlg="' + dlg + '"]',
        model: config.model,
        name: dlg,
      });

      templateArray.push(
        `<div data-dlg="${dlg}" class="vzb-top-dialog vzb-dialogs-dialog vzb-dialog-shadow"></div>`
      );
    });

    config.subcomponents = subcomponents;
    config.template = templateArray.join("\n");
    super(config);
  } 

  setup() {
    this.DOM = {

    };

    const _this = this;
    this._curr_dialog_index = 20;
    
    this.element.selectAll(".vzb-top-dialog").data(this.children.map(c => ({ 
      name: c.name
    })))
      .on("custom-dragstart", function(event, d) {
        _this.bringForward(d.name);
      })
      .select(".vzb-top-dialog>.vzb-dialog-modal>.vzb-dialog-buttons>[data-click='closeDialog']")
      .on("click", (event, d) => {
        this.toggleDialogOpen(d.name, false);
      });
  }

  draw() {
    this._buttonList = this.root.findChild({type: "ButtonList"});
    if(!this._buttonList) console.warn("Dialogs was unable to find a subcomponent of type 'ButtonList' in root component. Could be that index.js of a tool is lacking a configuration.");
  }

  resize() {
    const _this = this;
    const profile = this.services.layout.profile;

    this.children.forEach(childComp => {
      const dialogEl = childComp.element;
      let cls = dialogEl.attr("class").replace(" vzb-popup", "").replace(" vzb-sidebar", "");

      if (profile === "LARGE" && _this.ui.dialogs.sidebar.indexOf(childComp.name) > -1) {
        cls += _this._buttonList.ui.sidebarCollapse ? " vzb-popup" : " vzb-sidebar";
        if (!_this._buttonList.ui.sidebarCollapse) dialogEl.style("z-index", null);
      } else if (_this.ui.dialogs.popup.indexOf(childComp.name) > -1) {
        cls += " vzb-popup";
      }

      dialogEl.attr("class", cls);
    });

  }

  toggleDialogOpen(name, forceState) {
    runInAction(() => {
      const dialog = this.findChild({ name });
      if (!dialog) return;
      const newState = forceState ? forceState : !dialog.getOpen();
      dialog.setOpen(newState);

      if(newState) {
        this.openDialog(name);
      } else {
        this.closeDialog(name);
      }
    });
  }

  //TODO: make opening/closing a dialog via update and model
  /*
   * Activate a dialog
   * @param {String} id dialog id
   */
  openDialog(name) {
    //close pinned dialogs for small profile
    const forceClose = this.services.layout.profile === "SMALL";
    
    //TODO
    this.closeAllDialogs(forceClose);

    const dialog = this.element.selectAll(".vzb-popup.vzb-dialogs-dialog[data-dlg='" + name + "']");

    this._active_comp = this.findChild({ name });

    this._active_comp.beforeOpen();
    //add classes
    dialog.classed(class_active, true);

    this.bringForward(name);

    //call component function
    this._active_comp.open();
  }

  /*
   * Closes a dialog
   * @param {String} id dialog id
   */
  closeDialog(name) {
    const dialog = this.element.selectAll(".vzb-popup.vzb-dialogs-dialog[data-dlg='" + name + "']");

    this._active_comp = this.findChild({ name });

    if (this._active_comp && !this._active_comp.isOpen) return;

    if (this._active_comp.getPin())
      this._active_comp.setPin(false);

    if (this._active_comp) {
      this._active_comp.beforeClose();
    }
    //remove classes
    dialog.classed(class_active, false);

    //call component close function
    if (this._active_comp) {
      this._active_comp.close();
    }
    this._active_comp = false;

  }

  /*
  * Close all dialogs
  */
  closeAllDialogs(forceclose) {
    const _this = this;
    //remove classes
    const dialogClass = forceclose ? ".vzb-popup.vzb-dialogs-dialog.vzb-active" : ".vzb-popup.vzb-dialogs-dialog.vzb-active:not(.pinned)";
    const all_dialogs = this.element.selectAll(dialogClass);
    all_dialogs.each(d => {
      _this.toggleDialogOpen(d.name);
    });
  }

  bringForward(name) {
    const dialog = this.element.select(".vzb-popup.vzb-dialogs-dialog[data-dlg='" + name + "']");
    dialog.style("z-index", this._curr_dialog_index);
    this._curr_dialog_index += 10;
  }
}
