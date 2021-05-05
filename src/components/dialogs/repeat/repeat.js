import { Dialog } from "../dialog";
import {decorate, computed, runInAction} from "mobx";

/*
 * Repeat dialog
 */


class Repeat extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/repeat"></span>
        </div>

        <div class="vzb-dialog-content">
          <div class="vzb-repeat-header"></div>
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

    super(config);
  }

  setup() {
    this.DOM = {
      header: this.element.select(".vzb-repeat-header"),
      body: this.element.select(".vzb-repeat-body"),
      grid: this.element.select(".vzb-repeat-grid")
    };
  }

  get MDL(){
    return {
      repeat: this.model.encoding.repeat
    };
  }

  draw(){
    this.addReaction(this.drawHeader);
    this.addReaction(this.drawBody);
  }


  drawHeader(){
    this.DOM.header.html("Add or remove repeated charts");
  }

  drawBody(){
    const {rowcolumn, ncolumns, nrows} = this.MDL.repeat;
    const repeat = this.MDL.repeat;

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
      .on("mouseover", (d) => {
        d3.select(".vzb-" + repeat.getName(d))
          .classed("vzb-chart-highlight", true);
      })
      .on("mouseout", (d) => {
        d3.select(".vzb-" + repeat.getName(d))
          .classed("vzb-chart-highlight", false);
      });

    if (ncolumns > 1) {
      this.DOM.grid.selectAll("div.vzb-repeat-removecolumn")
        .data(Array(ncolumns))
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
              d3.select(".vzb-" + repeat.getName(d))
                .classed("vzb-chart-removepreview", true);
          });
        })
        .on("mouseout", () => {
          this._clearHoverClasses(rowcolumn, "vzb-chart-removepreview");
        });
    }

    if (nrows > 1) {
      this.DOM.grid.selectAll("div.vzb-repeat-removerow")
        .data(Array(nrows))
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
              d3.select(".vzb-" + repeat.getName(d))
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
            d3.select(".vzb-" + repeat.getName(d))
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
            d3.select(".vzb-" + repeat.getName(d))
              .classed("vzb-chart-addbelowpreview", true);
        });
      })
      .on("mouseout", () => {
        this._clearHoverClasses(rowcolumn, "vzb-chart-addbelowpreview");
      });
  }

  _clearHoverClasses(array, cssclass){
    array.forEach(d => {
      const selection = d3.select(".vzb-" + this.MDL.repeat.getName(d));

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
        this.model.config.encoding[newEncName] = {data: {concept: this._getConceptOfLast(direction)}};
        this.MDL.repeat.config[direction].push(newEncName);
      } else {
        this.MDL.repeat.config.rowcolumn = this.MDL.repeat.rowcolumn;
        if(direction == "column"){
          for (let i = 1; i <= nrows; i++) {
            const newEncNames = this._generateEncodingNames();
            allowEnc.forEach(e => {
              this.model.config.encoding[newEncNames[e]] = {data: {concept: this._getConceptOfLast(e)}};
            });
            this.MDL.repeat.config.rowcolumn.splice(i * ncolumns, 0, newEncNames);
          }
          this.MDL.repeat.config.ncolumns = ncolumns + 1;
        }
        if (direction == "row") {
          for (let i = 1; i <= ncolumns; i++) {
            const newEncNames = this._generateEncodingNames();
            allowEnc.forEach(e => {
              this.model.config.encoding[newEncNames[e]] = {data: {concept: this._getConceptOfLast(e)}};
            });
            this.MDL.repeat.config.rowcolumn.push(newEncNames);
          }
        }   
      }
    });
  }

  _getConceptOfLast(arg){
    const {rowcolumn, allowEnc} = this.MDL.repeat;

    let alias = arg;

    if(arg == "row") 
      alias = allowEnc[0];
      
    if(arg == "column") 
      alias = allowEnc[1];

    return rowcolumn
      .map(d => this.model.encoding[d[alias]]?.data?.concept)
      .filter(f => f)
      .at(-1) || "population_total";
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






