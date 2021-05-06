import { BaseService } from "./base-service.js";

export class CapitalVizabiService extends BaseService {

  setup(){
    this.Vizabi = this.config.Vizabi;
  }

  deconstruct() {
    delete this.Vizabi;
  }
}
