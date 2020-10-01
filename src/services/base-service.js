export class BaseService {

  isService() {return true;}

  constructor(config = {}){
    this.config = config;
    this.setup();
  }

  deconstruct() {}
  setup() {}
}
