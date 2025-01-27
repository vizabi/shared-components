import { BaseService } from "./base-service.js";
import { observable, decorate, autorun, computed, runInAction } from "mobx";
import { STATUS } from "../utils.js";
import * as utils from "../legacy/base/utils";
import * as d3 from "d3";

const FALLBACK_PATH = "./assets/locale/";
const FALLBACK_ID = "en";
const RTL_CSS_CLASS = "vzb-rtl";

const SHARE = "share";
const PERCENT = "percent";
class _LocaleService extends BaseService {

  static DEFAULTS = {
    id: FALLBACK_ID,
    path: FALLBACK_PATH,
    placeholder: "body",
    shortNumberFormat: true
  }

  setup(){
    this.status = STATUS.INIT;
    this.path = this.config.path || this.constructor.DEFAULTS.path;
    this.resolve = this.config.resolve;
    this.placeholder = this.config.placeholder || this.constructor.DEFAULTS.placeholder;
    this.element = d3.select(this.placeholder);
    this.content = {};

    this.removeLoadFileAutorun = autorun(this._loadFile.bind(this), {name: "Locale.js: _loadFile()"});
    this.removeApplyRTL = autorun(this._applyRTL.bind(this), {name: "Locale.js: _applyRTL()"});
  }

  get id() {
    return this.config.id || this.constructor.DEFAULTS.id;
  }

  get shortNumberFormat() {
    return this.config.shortNumberFormat ?? this.constructor.DEFAULTS.shortNumberFormat;
  }

  set id(id) {
    runInAction(() => {
      this.config.id = id;
      this.config.Vizabi.stores.dataSources.getAll().forEach(e => e.config.locale = id);
    });
  }

  set shortNumberFormat(shortNumberFormat) {
    this.config.shortNumberFormat = shortNumberFormat;
  }

  deconstruct(){
    this.removeLoadFileAutorun();
    super.deconstruct();
  }

  _applyRTL() {
    if (this.status !== STATUS.READY) return;
    this.element.classed(RTL_CSS_CLASS, this.isRTL());
  }

  _resolveReader(id) {
    if (this.resolve?.[id] && utils.isObject(this.resolve?.[id])) {
      return Promise.resolve(this.resolve?.[id]);
    }
    const path = this.resolve?.[id] ? this.resolve?.[id] : (this.path + id + ".json");
    return d3.json(path);
  }

  _loadFile(){
    this.status = STATUS.PENDING;

    const readers = [this._resolveReader(this.id)];
    if (this.id != FALLBACK_ID && !this.content[FALLBACK_ID]) {
      readers.push(this._resolveReader(FALLBACK_ID));
    }
    Promise.all(readers)
      .then((content) => {
        this.content[this.id] = content[0];
        if (content[1]) this.content[FALLBACK_ID] = content[1];
        this._initFormatters();
        this.status = STATUS.READY;
      })
      .catch((error) => {
        this.state = STATUS.ERROR;
        throw error;
      });
  }

  _initFormatters(){
    const percentSymbol = this.getPercentSymbol();

    this.shortNumberF = function (x,  shareOrPercent) {
        
      // share works like rounded if set to SHARE, but multiplies by 100 and suffixes with "%"
      // percent works like rounded if set to PERCENT, but suffixes with "%"
      
      const EPSILON = 0.00000000000001;

      if (shareOrPercent === SHARE) x *= 100;
  
      if (Math.abs(x) < EPSILON) return "0";
  
      const format = "~r"; //rounded format. use "f" for fixed, ~ trims insignificant trailing zeros
      const prec = 3; //round to so many significant digits
  
      let suffix = "";
  
      //---------------------
      // BEAUTIFIERS GO HOME!
      // don't break formatting please
      //---------------------
      // the tiny constant compensates epsilon-error when doing logarithms
      /* eslint-disable */
      switch (Math.floor(Math.log(Math.abs(x)) / Math.LN10 + EPSILON)) {
        case 0:  break; //1
        case -1: break; //0.1
        case 1:  break; //10
        case -2: break; //0.01
        case 2:  break; //100
        case -3: break; //0.001
        case 3:  break; //1000
        case -4: break; //0.0001
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
        
        case -5: x *= 1000000; suffix = "µ"; break; //10µ
        case -6: x *= 1000000; suffix = "µ"; break; //1µ
        case -7: x *= 1000000; suffix = "µ"; break; //0.1µ
        case -10: x *= 1000000000; suffix = "n"; break; //0.1n
        case -13: x *= 1000000000000; suffix = "p"; break; //0.1p

        //use the D3 SI formatting for the extreme cases
        default: return (d3.format("." + prec + "s")(x)).replace("G", "B");
      }
      /* eslint-enable */
  
      let formatted = d3.format("." + prec + format)(x);
  
      // use manual formatting for the cases above
      return (formatted + suffix + (shareOrPercent === PERCENT || shareOrPercent === SHARE ? percentSymbol : ""));
    };

    const d3LongNumberFormatter = d3.formatLocale({
      decimal: ".",
      thousands: " ", //short space
      grouping: [3],
    }).format(",.3~r");

    this.longNumberF = function(x, shareOrPercent) {
      if (shareOrPercent === SHARE) x *= 100;
      return d3LongNumberFormatter(x) + (shareOrPercent === PERCENT || shareOrPercent === SHARE ? percentSymbol : "");
    };

    this.dateF = {
      year: d3.utcFormat("%Y"),
      month: d3.utcFormat("%Y-%m"),
      day: d3.utcFormat("%Y-%m-%d"),
      week: d3.utcFormat("%Yw%V"),
      quarter: d3.utcFormat("%Yq%q")
    };

    this.stringF = function(string){
      //the inline conditionals are needed because some translation files are stuck in cache 
      //and don't have the "dictionary" object but have strings in the root instead
      let translated = this.content[this.id].dictionary? this.content[this.id].dictionary[string] : this.content[this.id][string];
      if (translated || translated === "") return translated;
      translated = this.content[FALLBACK_ID].dictionary? this.content[FALLBACK_ID].dictionary[string] : this.content[FALLBACK_ID][string];
      if (translated || translated === "") return translated;
      return string;
    };
  }
  
  getFormattedNumber(arg, shareOrPercent) {
    return this.shortNumberFormat ? this.shortNumberF(arg, shareOrPercent) : this.longNumberF(arg, shareOrPercent);
  }

  getFormattedDate(arg, dateIntervalSize = "year") {
    return this.dateF[dateIntervalSize](arg);
  }
  
  getUIstring(arg) {
    return this.stringF(arg);
  }

  auto(options = {}){
    return (function(arg){
      // null, NaN and undefined are bypassing any formatter
      if (!arg && arg !== 0 && arg !== "") return arg;
      if (typeof arg === "number") return this.getFormattedNumber(arg, options.shareOrPercent);
      if (arg instanceof Date) return this.getFormattedDate(arg, options.interval);
      if (typeof arg === "string") return this.getUIstring(arg);
    }).bind(this);
  }

  isRTL(){
    return !!this.content[this.id].rtl;
  }

  getPercentSymbol(){
    return this.content[this.id].percentSymbol || "%";
  }
}

export const LocaleService = decorate(_LocaleService, {
  "id": computed,
  "shortNumberFormat": computed,
  "status": observable
});
