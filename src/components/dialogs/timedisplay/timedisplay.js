import { Dialog } from "../dialog";
import { DateTimeBackground } from "../../datetime-background/datetime-background";

/*
 * Timedisplay dialog
 */
class TimeDisplay extends Dialog {
  constructor(config) {
    config.template = `
      <div class="vzb-dialog-modal">
        <div class="vzb-dialog-title"></div>
        <div class="vzb-dialog-content vzb-dialog-content-fixed"></div>
        <div class="vzb-dialog-buttons"></div>
      </div>`;
  
    config.subcomponents = [{
      type: DateTimeBackground,
      placeholder: ".vzb-dialog-content"
    }];
    
    super(config);
  }
}

Dialog.add("timedisplay", TimeDisplay);
export { TimeDisplay };