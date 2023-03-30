import { Dialog } from "../dialog";
import {decorate, computed, runInAction} from "mobx";
import { SimpleCheckbox } from "../../simplecheckbox/simplecheckbox";
import * as d3 from "d3";

/*
 * Repeat dialog
 */


class Repeat extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <span class="thumb-tack-class thumb-tack-class-ico-pin fa" data-dialogtype="colors" data-click="pinDialog"></span>
        <span class="thumb-tack-class thumb-tack-class-ico-drag fa" data-dialogtype="colors" data-click="dragDialog"></span>

        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/repeat"></span>
        </div>

        <div class="vzb-dialog-content">
          <div class="vzb-repeat-header">
            <div class="vzb-useConnectedRowsAndColumns-switch"></div>
          </div>
          <div class="vzb-repeat-body">
            <div class="vzb-repeat-grid"></div>
          </div>
        </div>
    
        <div class="vzb-dialog-buttons">
          <div data-click="closeDialog" class="vzb-dialog-button vzb-label-primary">
            <span data-localise="buttons/ok"></span>
          </div>
        </div>
      </div>
    `;

    config.subcomponents = [{
      type: SimpleCheckbox,
      placeholder: ".vzb-useConnectedRowsAndColumns-switch",
      options: {
        checkbox: "useConnectedRowsAndColumns",
        submodelFunc: () => this.MDL.repeat,
        setCheckboxFunc: (value) => this.MDL.repeat.config.useConnectedRowsAndColumns = value
      }
    }];

    super(config);
  }

  setup(options) {
    super.setup(options);

    this.DOM.header = this.element.select(".vzb-repeat-header");
    this.DOM.body = this.element.select(".vzb-repeat-body");
    this.DOM.grid = this.element.select(".vzb-repeat-grid");
  }

  get MDL(){
    return {
      repeat: this.model.encoding.repeat
    };
  }

  draw(){
    super.draw();

    this.addReaction(this.drawHeader);
    this.addReaction(this.drawBody);
  }


  drawHeader(){
    const header = this.DOM.header;
    const localise = this.services.locale.auto();
    const {allowEnc, row, column, useConnectedRowsAndColumns} = this.MDL.repeat;

    header.selectAll("p").remove();

    header.insert("p", "div")
      .attr("class", "vzb-dialog-sublabel")
      .html(localise("hint/repeat/addremovecharts"));

    header.select(".vzb-useConnectedRowsAndColumns-switch")
      .classed("vzb-hidden", !(row && row.length && column && column.length && allowEnc.length === 2))

    if (useConnectedRowsAndColumns) {
      header.append("p")
        .html(allowEnc[0] + " " + localise("hint/repeat/issharedacrossrows"));
      header.append("p")
        .html(allowEnc[1] + " " + localise("hint/repeat/issharedacroscolumns"));
    }
  }

  drawBody(){
    const {rowcolumn, ncolumns, nrows} = this.MDL.repeat;
    const repeat = this.MDL.repeat;
    const localise = this.services.locale.auto();

    this.DOM.grid
      .style("grid-template-rows", "1fr ".repeat(nrows) + "30px")
      .style("grid-template-columns", "1fr ".repeat(ncolumns) + "30px");

    this.DOM.grid.selectAll("div").remove();

    this.DOM.grid.selectAll("div")
      .data(rowcolumn, d => repeat.getName(d))
      .enter().append("div")
      .attr("class", "vzb-repeat-segment")
      .attr("title", d => JSON.stringify(d, null, 1))
      .style("grid-row-start", (_, i) => repeat.getRowIndex(i) + 1)
      .style("grid-column-start", (_, i) => repeat.getColumnIndex(i) + 1)
      .html(() => ncolumns == 1 && nrows == 1 ? localise("hint/repeat/pressplus") : "")
      .on("mouseover", (event, d) => {
        this.root.element.select(".vzb-" + repeat.getName(d))
          .classed("vzb-chart-highlight", true);
      })
      .on("mouseout", (event, d) => {
        this.root.element.select(".vzb-" + repeat.getName(d))
          .classed("vzb-chart-highlight", false);
      });

    if (ncolumns > 1) {
      this.DOM.grid.selectAll("div.vzb-repeat-removecolumn")
        .data(d3.range(ncolumns))
        .enter().append("div")
        .attr("class", "vzb-repeat-removecolumn")
        .html("✖︎")
        .style("grid-column-start", (_, i) => i + 1)
        .on("click", (_, i) => {
          this._remove("column", i);
          this._clearHoverClasses(rowcolumn);
        })
        .on("mouseover", (_, i) => {
          rowcolumn.forEach((d, index) => {
            if (index % ncolumns == i)
              this.root.element.select(".vzb-" + repeat.getName(d))
                .classed("vzb-chart-removepreview", true);
          });
        })
        .on("mouseout", () => {
          this._clearHoverClasses(rowcolumn, "vzb-chart-removepreview");
        });
    }

    if (nrows > 1) {
      this.DOM.grid.selectAll("div.vzb-repeat-removerow")
        .data(d3.range(nrows))
        .enter().append("div")
        .attr("class", "vzb-repeat-removerow")
        .html("✖︎")
        .style("grid-row-start", (_, i) => i + 1)
        .on("click", (_, i) => {
          this._remove("row", i);
          this._clearHoverClasses(rowcolumn);
        })
        .on("mouseover", (_, i) => {
          rowcolumn.forEach((d, index) => {
            if (Math.floor(index / ncolumns) == i)
              this.root.element.select(".vzb-" + repeat.getName(d))
                .classed("vzb-chart-removepreview", true);
          });
        })
        .on("mouseout", () => {
          this._clearHoverClasses(rowcolumn, "vzb-chart-removepreview");
        });
    }

    this.DOM.grid.append("div")
      .attr("class", "vzb-repeat-addcolumn")
      .html("✚")
      .style("grid-row-start", 1)
      .style("grid-row-end", nrows + 1)
      .style("grid-column-start", ncolumns + 1)
      .on("click", () => {
        this._createNew("column");
        this._clearHoverClasses(rowcolumn);
      })
      .on("mouseover", () => {
        rowcolumn.forEach((d, i) => {
          if ((i + 1) % ncolumns == 0)
            this.root.element.select(".vzb-" + repeat.getName(d))
              .classed("vzb-chart-addrightpreview", true);
        });
      })
      .on("mouseout", () => {
        this._clearHoverClasses(rowcolumn, "vzb-chart-addrightpreview");
      });

    this.DOM.grid.append("div")
      .attr("class", "vzb-repeat-addrow")
      .html("✚")
      .style("grid-row-start", nrows + 1)
      .style("grid-column-start", 1)
      .style("grid-column-end", ncolumns + 1)
      .on("click", () => {
        this._createNew("row");
        this._clearHoverClasses(rowcolumn);
      })
      .on("mouseover", () => {
        rowcolumn.forEach((d, i) => {
          if (Math.floor(i / ncolumns) + 1 == nrows)
            this.root.element.select(".vzb-" + repeat.getName(d))
              .classed("vzb-chart-addbelowpreview", true);
        });
      })
      .on("mouseout", () => {
        this._clearHoverClasses(rowcolumn, "vzb-chart-addbelowpreview");
      });
  }

  _clearHoverClasses(array, cssclass){
    array.forEach(d => {
      const selection = this.root.element.select(".vzb-" + this.MDL.repeat.getName(d));

      if(!cssclass || cssclass == "vzb-chart-highlight")
        selection.classed("vzb-chart-highlight", false);

      if(!cssclass || cssclass == "vzb-chart-removepreview")
        selection.classed("vzb-chart-removepreview", false);

      if(!cssclass || cssclass == "vzb-chart-addbelowpreview")
        selection.classed("vzb-chart-addbelowpreview", false);

      if(!cssclass || cssclass == "vzb-chart-addrightpreview")
        selection.classed("vzb-chart-addrightpreview", false);
    });
  }

  _remove(direction, index){
    if(direction !== "row" && direction !== "column") return console.error("incorrect use of function _remove in repeat dialog");
    const {ncolumns, nrows, useConnectedRowsAndColumns} = this.MDL.repeat;
    runInAction(() => {
      if(useConnectedRowsAndColumns) {
        this.MDL.repeat.config[direction].splice(index, 1);
      } else {
        if(direction == "column"){
          for (let i = 1; i <= nrows; i++) {
            this.MDL.repeat.config.rowcolumn.splice(i * index, 1);
          }
          this.MDL.repeat.config.ncolumns = ncolumns - 1;
        }
        if (direction == "row") {
          this.MDL.repeat.config.rowcolumn.splice(ncolumns * index, ncolumns);
        }   
      }
    });
  }

  _createNew(direction){
    if(direction !== "row" && direction !== "column") return console.error("incorrect use of function _createNew in repeat dialog");
    const {ncolumns, nrows, allowEnc, useConnectedRowsAndColumns} = this.MDL.repeat;
    runInAction(() => {
      if(useConnectedRowsAndColumns) {
        const newEncName = this._generateEncodingNames(direction);
        this.model.config.encoding[newEncName] = {data: this._getConceptAndSourceAndSpaceOfLast(direction)};
        this.MDL.repeat.config[direction].push(newEncName);
      } else {
        this.MDL.repeat.config.rowcolumn = this.MDL.repeat.rowcolumn;
        if(direction == "column"){
          for (let i = 1; i <= nrows; i++) {
            const newEncNames = this._generateEncodingNames();
            allowEnc.forEach(e => {
              this.model.config.encoding[newEncNames[e]] = {data: this._getConceptAndSourceAndSpaceOfLast(e)};
            });
            this.MDL.repeat.config.rowcolumn.splice(i * ncolumns, 0, newEncNames);
          }
          this.MDL.repeat.config.ncolumns = ncolumns + 1;
        }
        if (direction == "row") {
          for (let i = 1; i <= ncolumns; i++) {
            const newEncNames = this._generateEncodingNames();
            allowEnc.forEach(e => {
              this.model.config.encoding[newEncNames[e]] = {data: this._getConceptAndSourceAndSpaceOfLast(e)};
            });
            this.MDL.repeat.config.rowcolumn.push(newEncNames);
          }
        }   
      }
    });
  }

  _getConceptAndSourceAndSpaceOfLast(arg){
    const {rowcolumn, allowEnc} = this.MDL.repeat;

    let alias = arg;

    if(arg == "row") 
      alias = allowEnc[0];
      
    if(arg == "column") 
      alias = allowEnc[1];

    return rowcolumn
      .map(d => this.model.encoding[d[alias]]?.data)
      .filter(f => f?.concept)
      .map(d => Object.assign({ concept: d.concept }, d.config.source ? { source: d.config.source } : {}, d.config.space ? { space: d.config.space.slice(0) } : {}))
      .at(-1) || { concept: "population_total" };
  }

  _generateEncodingNames(direction){
    const {allowEnc} = this.MDL.repeat;

    if(direction == "row") 
      return this._generateEncodingName(allowEnc[0]);

    if(direction == "column") 
      return this._generateEncodingName(allowEnc[1]);
    
    return allowEnc.reduce((obj, alias) => {
      obj[alias] = this._generateEncodingName(alias);
      return obj;
    }, {});
  }
  _generateEncodingName(alias){
    const {rowcolumn} = this.MDL.repeat;
    const prefix = alias; //can be "repeat_"+alias or something
    return prefix + (d3.max(rowcolumn.map(d => +d[alias].replace(prefix,"") || 0)) + 1);
  }



}


const decorated = decorate(Repeat, {
  "MDL": computed
});
  
Dialog.add("repeat", decorated);
export { decorated as Repeat};






