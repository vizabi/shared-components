import { Dialog } from "../dialog";
import * as d3 from "d3";

/*
 * About dialog
 */
function formatVersion(version){
  return version || "N/A";
}

function formatBuild(timestamp){
  if (!timestamp) return "N/A";
  return d3.utcFormat("%Y-%m-%d at %H:%M")(new Date(parseInt(timestamp)));
}

function url(text = "", link = ""){
  if (!link) return text;
  return `<a class='vzb-underline' href='${link}' target='_blank'>⧉ ${text}</a>`;
}
function mailto(mailto = ""){
  return `💌 <a class='vzb-underline' href='mailto:${mailto}' target='_blank'>${mailto}</a>`;
}

export class About extends Dialog {
  constructor(config) {
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title"> 
          <span data-localise="buttons/about"></span>
        </div>

        <div class="vzb-dialog-content">
          <div class="vzb-about-header"></div>
          <div class="vzb-about-body"></div>
          <div class="vzb-about-footer"></div>
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
      header: this.element.select(".vzb-about-header"),
      body: this.element.select(".vzb-about-body"),
      footer: this.element.select(".vzb-about-footer")
    };
  }

  draw(){
    this.addReaction(this.drawHeader);
    this.addReaction(this.drawBody);
    this.addReaction(this.drawFooter);
  }


  drawHeader(){
    const author = this.root.constructor.versionInfo?.sharedComponents?.package?.author || {};

    this.DOM.header.html("");
    this.DOM.header.append("p").html("Next level data graphics");
    this.DOM.header.append("p").html("This chart is made with Vizabi, <br/> an open-source project originally <br/> built at " + url(author.name, author.url) + "<br/> Currently maintained and extended by <br/> Angie and team at "  + url("Visual Encodings AB", "https://visual-encodings.com"));
    this.DOM.header.append("p").html("If you would like to use these graphs, we <br/> can help you set them up and customise <br/>"  + mailto("info@visual-encodings.com"));
  }


  drawBody(){
    const vizabiModulesData = [
      this.root.constructor.versionInfo || {},
      this.root.constructor.versionInfo?.sharedComponents || {},
      this.services.Vizabi.Vizabi.versionInfo || {}
    ];

    const readerData = this.services.Vizabi.Vizabi.stores.dataSources.getAll().map(dataSource => {
      const datasetInfo = dataSource.reader.getDatasetInfo ? dataSource.reader.getDatasetInfo() : {};
      return {
        name: dataSource.config.name || datasetInfo.name,
        url: dataSource.config.path,
        type: dataSource.config.modelType
      };
    }); 

    this.DOM.body.html("");
    this.DOM.body.append("div").append("p").append("h1").html("Components:");
    this.DOM.body.append("div").selectAll("p")
      .data(vizabiModulesData)
      .enter().append("p")
      .html(d => url(d.package?.description || d.package?.name, d.package?.homepage) + `<br/> - Version: ${formatVersion(d.version)} <br/> - Build ${formatBuild(d.build)}`);
    
    this.DOM.body.append("div").append("p").append("h1").html("Data sources:");
    this.DOM.body.append("div").selectAll("p")
      .data(readerData)
      .enter().append("p")
      .html(d =>  url(d.type + " " + d.name, d.url));
  }


  drawFooter(){
    const contributors = this.root.constructor.versionInfo?.sharedComponents?.package?.contributors || [];
    
    this.DOM.footer.html("");
    this.DOM.footer.append("p").append("h1").html(`Contributors:`);
    this.DOM.footer.append("p").selectAll("span")
      .data(contributors)
      .enter().append("span")
      .html(d => url(d.name, d.url));
  }
}

Dialog.add("about", About);




