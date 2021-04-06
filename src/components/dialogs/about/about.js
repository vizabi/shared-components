import * as utils from "base/utils";
import { Dialog } from "../dialog";

import globals from "base/globals";

/*
 * About dialog
 */

export class About extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/about"></span>
        </div>

        <div class="vzb-dialog-content">
          <p class="vzb-about-text0"></p>
          <p class="vzb-about-text1"></p>
          <br/>
          <p class="vzb-about-version"></p>
          <p class="vzb-about-updated"></p>
          <br/>
          <p class="vzb-about-report"></p>
          <br/>
          <p class="vzb-about-credits"></p>
          <br/>
          <p class="vzb-about-tool"></p>
          <br/>
          <p class="vzb-about-datasets"><span>Datasets:</span></p>
          <br/>
          <p class="vzb-about-readers"><span>Readers:</span></p>
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

  setup(options) {
    const version = "TODO";//globals.version;
    const updated = Date.now();//new Date(parseInt(globals.build));

    this.element.select(".vzb-about-text0")
      .html("This chart is made with Vizabi,");
    this.element.select(".vzb-about-text1")
      .html("a project by <a href='http://gapminder.org' target='_blank'>Gapminder Foundation</a>");
    this.element.select(".vzb-about-version")
      .html("<a href='https://github.com/Gapminder/vizabi/releases/tag/v" + version + "' target='_blank'>Version: " + version + "</a>");
    this.element.select(".vzb-about-updated")
      .html("Build: " + d3.utcFormat("%Y-%m-%d at %H:%M")(updated));
    this.element.select(".vzb-about-report")
      .html("<a href='https://getsatisfaction.com/gapminder/' target='_blank'>Report a problem</a>");
    this.element.select(".vzb-about-credits")
      .html("<a href='https://github.com/Gapminder/vizabi/graphs/contributors' target='_blank'>Contributors</a>");

    //versions
    const dataStore = Vizabi.stores.dataSources;

    const toolData = {};
    const versionInfo = this.root.versionInfo;
    toolData.version = versionInfo ? versionInfo.version : "N/A";
    toolData.build = versionInfo ? d3.time.format("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
    toolData.name = this.root.name;

    const toolsEl = this.element.select(".vzb-about-tool");
    toolsEl.html("");
    toolsEl.append("p")
      .text("Tool: " + toolData.name);
    toolsEl.append("p")
      .text("-version: " + toolData.version);
    toolsEl.append("p")
      .text("-build: " + toolData.build);

    const readerData = dataStore.getAll().map(dataSource => {
      const data = {};
      const versionInfo = dataSource.reader.versionInfo;
      data.version = versionInfo ? versionInfo.version : "N/A";
      data.build = versionInfo ? d3.utcFormat("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
      data.name = dataSource.reader._name;
      return data;
    });

    let readersEl = this.element.select(".vzb-about-readers").selectAll(".vzb-about-reader").data(readerData);
    readersEl.exit().remove();
    readersEl = readersEl.enter()
      .append("p")
      .attr("class", "vzb-about-reader");
    readersEl.append("p")
      .text(d => d.name);
    readersEl.append("p")
      .text(d => "-version: " + d.version);
    readersEl.append("p")
      .text(d => "-build: " + d.build);

    const datasetData = dataStore.getAll().map(dataSource => dataSource.reader.getDatasetName && dataSource.reader.getDatasetName());

    let datasetsEl = this.element.select(".vzb-about-datasets").selectAll(".vzb-about-dataset").data(datasetData);
    datasetsEl.exit().remove();
    datasetsEl = datasetsEl.enter()
      .append("p")
      .attr("class", "vzb-about-dataset");
    datasetsEl.append("p")
      .text(d => d);
  }

}

Dialog.add("about", About);







const _About = {

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
  init(config, parent) {
    this.name = "about";

    this._super(config, parent);
  },

  readyOnce() {
    const version = globals.version;
    const updated = new Date(parseInt(globals.build));

    this.element = d3.select(this.element);
    this.element.select(".vzb-about-text0")
      .html("This chart is made with Vizabi,");
    this.element.select(".vzb-about-text1")
      .html("a project by <a href='http://gapminder.org' target='_blank'>Gapminder Foundation</a>");
    this.element.select(".vzb-about-version")
      .html("<a href='https://github.com/Gapminder/vizabi/releases/tag/v" + version + "' target='_blank'>Version: " + version + "</a>");
    this.element.select(".vzb-about-updated")
      .html("Build: " + d3.time.format("%Y-%m-%d at %H:%M")(updated));
    this.element.select(".vzb-about-report")
      .html("<a href='https://getsatisfaction.com/gapminder/' target='_blank'>Report a problem</a>");
    this.element.select(".vzb-about-credits")
      .html("<a href='https://github.com/Gapminder/vizabi/graphs/contributors' target='_blank'>Contributors</a>");

    //versions
    const data = Data;

    const toolData = {};
    const versionInfo = this.root.versionInfo;
    toolData.version = versionInfo ? versionInfo.version : "N/A";
    toolData.build = versionInfo ? d3.time.format("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
    toolData.name = this.root.name;

    const toolsEl = this.element.select(".vzb-about-tool");
    toolsEl.html("");
    toolsEl.append("p")
      .text("Tool: " + toolData.name);
    toolsEl.append("p")
      .text("-version: " + toolData.version);
    toolsEl.append("p")
      .text("-build: " + toolData.build);

    const readerData = data.instances.map(dataInstance => {
      const data = {};
      const versionInfo = dataInstance.readerObject.versionInfo;
      data.version = versionInfo ? versionInfo.version : "N/A";
      data.build = versionInfo ? d3.time.format("%Y-%m-%d at %H:%M")(new Date(parseInt(versionInfo.build))) : "N/A";
      data.name = dataInstance.readerObject._name;
      return data;
    });

    let readersEl = this.element.select(".vzb-about-readers").selectAll(".vzb-about-reader").data(readerData);
    readersEl.exit().remove();
    readersEl = readersEl.enter()
      .append("p")
      .attr("class", "vzb-about-reader");
    readersEl.append("p")
      .text(d => d.name);
    readersEl.append("p")
      .text(d => "-version: " + d.version);
    readersEl.append("p")
      .text(d => "-build: " + d.build);

    const datasetData = data.instances.map(dataInstance => dataInstance.getDatasetName());

    let datasetsEl = this.element.select(".vzb-about-datasets").selectAll(".vzb-about-dataset").data(datasetData);
    datasetsEl.exit().remove();
    datasetsEl = datasetsEl.enter()
      .append("p")
      .attr("class", "vzb-about-dataset");
    datasetsEl.append("p")
      .text(d => d);

  }
};
