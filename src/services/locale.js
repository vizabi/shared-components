import BaseService from "./base-service.js";
import { observable, decorate, autorun } from "mobx";
import { STATUS } from "../utils.js";

const PATH_TO_FILE = "../assets/locale/";
const FALLBACK_ID = "en";

class LocaleService extends BaseService {

  setup(){
    this.status = STATUS.INIT;
    this.id = FALLBACK_ID;
    this.content = {};
    autorun(this.loadFile.bind(this));
  }

  loadFile(){
    this.status = STATUS.PENDING;
    d3.json(PATH_TO_FILE + this.id + ".json")
      .then((content) => {
        this.content[this.id] = content;
        this.status = STATUS.READY;
      })
      .catch((error) => {
        this.state = STATUS.ERROR;
        throw error;
      });
  }

  auto(arg){
    if (arg instanceof Date) return this.getFormattedDate(arg);
    if (typeof arg === "string") return this.getUIstring(arg);
    if (typeof arg === "number") return this.getFormattedNumber(arg);
  }

  getDateFormatter(date) {
    return date;
  }

  getNumberFormatter(number) {
    return number;
  }

  getStringTranslator(){
    return (function(string){
      let translated = this.content[this.id].dictionary[string];
      if (translated || translated === "") return translated;
      translated = this.content[FALLBACK_ID].dictionary[string];
      if (translated || translated === "") return translated;
      return string;
    }).bind(this);
  }
}

export default decorate(LocaleService, {
  "id": observable,
  "status": observable
});