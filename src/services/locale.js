import BaseService from "./base-service.js";
import { observable, decorate, autorun } from "mobx";

const PATH_TO_FILE = "../assets/locale/";
const FALLBACK_ID = "en";

class LocaleService extends BaseService {

  setup(){
    this.state = "init";
    this.id = FALLBACK_ID;
    this.content = {};
    autorun(this.loadFile.bind(this));
  }

  loadFile(){
    this.state = "pending";
    d3.json(PATH_TO_FILE + this.id + ".json")
      .then((content) => {
        this.content[this.id] = content;
        this.state = "ready";
      })
      .catch((error) => {
        this.state = "error";
        throw error;
      });
  }

  getTFunction(){
    const t = function(arg){return this.content[this.id].dictionary[arg]};
    return t.bind(this);
  }
}

export default decorate(LocaleService, {
  "id": observable,
  "content": observable,
  "state": observable
});