import { BaseService } from "./base-service.js";
import { observable, decorate, autorun } from "mobx";
import { STATUS } from "../utils.js";

const FALLBACK_PATH = "./assets/locale/";
const FALLBACK_ID = "en";

class _LocaleService extends BaseService {

  setup(){
    this.status = STATUS.INIT;
    this.id = this.config.id || FALLBACK_ID;
    this.path = this.config.path || FALLBACK_PATH;
    this.content = {};
    
    this.removeLoadFileAutorun = autorun(this._loadFile.bind(this), {name: "Locale.js: _loadFile()"});
  }

  
  deconstruct(){
    this.removeLoadFileAutorun();
    super.deconstruct();
  }

  _loadFile(){
    this.status = STATUS.PENDING;
    d3.json(this.path + this.id + ".json")
      .then((content) => {
        this.content[this.id] = content;
        this._initFormatters();
        this.status = STATUS.READY;
      })
      .catch((error) => {
        this.state = STATUS.ERROR;
        throw error;
      });
  }

  _initFormatters(){
    this.numberF = function (x,  options) {
        
      // share works like rounded if set to SHARE, but multiplies by 100 and suffixes with "%"
      // percent works like rounded if set to PERCENT, but suffixes with "%"
      const SHARE = "share";
      const PERCENT = "percent";
      const NOSUFFIX = "nosuffix";
      const EPSILON = 0.00000000000001;

      if (options === SHARE) x *= 100;
  
      if (Math.abs(x) < EPSILON) return "0";
  
      const format = "r"; //rounded format. use "f" for fixed
      const prec = 3; //round to so many significant digits
  
      let suffix = "";
      if (options === NOSUFFIX) return d3.format("." + prec + format)(x);
  
      //---------------------
      // BEAUTIFIERS GO HOME!
      // don't break formatting please
      //---------------------
      // the tiny constant compensates epsilon-error when doing logarithms
      /* eslint-disable */
      switch (Math.floor(Math.log(Math.abs(x)) / Math.LN10 + EPSILON)) {
        case -13: x *= 1000000000000; suffix = "p"; break; //0.1p
        case -10: x *= 1000000000; suffix = "n"; break; //0.1n
        case -7: x *= 1000000; suffix = "µ"; break; //0.1µ
        case -6: x *= 1000000; suffix = "µ"; break; //1µ
        case -5: x *= 1000000; suffix = "µ"; break; //10µ
        case -4: break; //0.0001
        case -3: break; //0.001
        case -2: break; //0.01
        case -1: break; //0.1
        case 0:  break; //1
        case 1:  break; //10
        case 2:  break; //100
        case 3:  break; //1000
        case 4:  x /= 1000; suffix = "k"; break; //10k
        case 5:  x /= 1000; suffix = "k"; break; //100k
        case 6:  x /= 1000000; suffix = "M"; break; //1M
        case 7:  x /= 1000000; suffix = "M"; break; //10M
        case 8:  x /= 1000000; suffix = "M"; break; //100M
        case 9:  x /= 1000000000; suffix = "B"; break; //1B
        case 10: x /= 1000000000; suffix = "B"; break; //10B
        case 11: x /= 1000000000; suffix = "B"; break; //100B
        case 12: x /= 1000000000000; suffix = "TR"; break; //1TR
        case 13: x /= 1000000000000; suffix = "TR"; break; //10TR
        case 14: x /= 1000000000000; suffix = "TR"; break; //100TR
        //use the D3 SI formatting for the extreme cases
        default: return (d3.format("." + prec + "s")(x)).replace("G", "B");
      }
      /* eslint-enable */
  
      let formatted = d3.format("." + prec + format)(x);
      //remove trailing zeros if dot exists to avoid numbers like 1.0M, 3.0B, 1.500, 0.9700, 0.0
      if (formatted.indexOf(".") > -1) formatted = formatted.replace(/0+$/, "").replace(/\.$/, "");
  
      // use manual formatting for the cases above
      return (formatted + suffix + (options === PERCENT || options === SHARE ? "%" : ""));
    };

    this.dateF = d3.timeFormat("%Y");
    
    this.stringF = function(string){
      let translated = this.content[this.id].dictionary[string];
      if (translated || translated === "") return translated;
      translated = this.content[FALLBACK_ID].dictionary[string];
      if (translated || translated === "") return translated;
      return string;
    };
  }
  
  getFormattedNumber(arg) {
    return this.numberF(arg);
  }

  getFormattedDate(arg) {
    return this.dateF(arg);
  }
  
  getUIstring(arg) {
    return this.stringF(arg);
  }

  auto(){
    return (function(arg){
      // null, NaN and undefined are bypassing any formatter
      if (!arg && arg !== 0 && arg !== "") return arg;
      if (typeof arg === "number") return this.getFormattedNumber(arg);
      if (arg instanceof Date) return this.getFormattedDate(arg);
      if (typeof arg === "string") return this.getUIstring(arg);
    }).bind(this);
  }

  isRTL(){
    return !!this.content[this.id].rtl;
  }
}

export const LocaleService = decorate(_LocaleService, {
  "id": observable,
  "status": observable
});