export class BaseService {

  isService() {return true;}

  constructor(model = {}){
    this.model = model;
    this.setup();
  }

  setup() {}
}
