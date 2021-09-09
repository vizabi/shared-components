
import { css } from "./config";
import { runInAction } from "mobx";
import * as utils from "../../legacy/base/utils";
import * as Utils from "../../utils";

function spacesAreEqual(a, b){
  return a.concat().sort().join() === b.concat().sort().join();
}
export class DeepLeaf{

  constructor(context, view){
    this.context = context;
    this.view = view;
    this.spaceChanged = false;
    this.encoding = this.context._targetModel;
    this.datum = view.datum();

    this.buildLeaf();
  }
  
  _getDatumForDS(){    
    return this.datum.byDataSources.find(f => f.dataSource == this.encoding.data.source) || this.datum.byDataSources[0];
  }
  _isSelectedConcept() {
    return this.datum.id == this.encoding.data.concept;
  }

  buildLeaf() {        
    this.view.selectAll("div").remove();

    const leafContent = this.view
      .append("div").attr("class", `${css.leaf} ${css.leaf_content} vzb-dialog-scrollable`)
      .style("width", this.width + "px");
    
    this.DOM = {
      title: leafContent.append("div")
        .attr("class", `${css.leaf_content_item} ${css.leaf_content_item_title}`),

      datasourceContainer: leafContent.append("div")
        .attr("class", `${css.leaf_content_item} ${css.leaf_content_item_datasources}`)
        .on("click", event => event.stopPropagation()),

      spaceContainer: leafContent.append("div")
        .classed(css.leaf_content_item + " " + css.leaf_content_item_space, true)
        .on("click", event => event.stopPropagation()),

      descr: leafContent.append("div")
        .attr("class", `${css.leaf_content_item} ${css.leaf_content_item_descr}`),

      helptranslate: leafContent.append("div")
        .attr("class", `${css.leaf_content_item} ${css.leaf_content_item_helptranslate}`)
    };
    
    this.updateNameSection();
    this.updateDatasoutceSection();
    this.updateSpaceSection();
    this.updateDescrSection();
  }

  updateNameSection(datumForDS = this._getDatumForDS()){
    this.DOM.title.text(utils.replaceNumberSpacesToNonBreak(datumForDS.name) || "");
  }


  updateDescrSection(datumForDS = this._getDatumForDS()){   
    this.DOM.descr.text(utils.replaceNumberSpacesToNonBreak(datumForDS.description || this.context.localise("hints/nodescr")));

    this.DOM.helptranslate
      .classed("vzb-invisible", !datumForDS.dataSource?.translateContributionLink)
      .html(`<a href="${datumForDS.dataSource?.translateContributionLink}" target="_blank">${this.context.localise("dialogs/helptranslate")}</a>`);
  }


  updateDatasoutceSection(){
    const _this = this;

    if(this.datum.id == "_default") return;

    const getDSColorLight = (v) => this.context.dsColorScaleLight(v.dataSource.id);
    const getDSColorDark = (v) => this.context.dsColorScaleDark(v.dataSource.id);
    const paintBackground = (v) => (v.dataSource == this.encoding.data.source) && this._isSelectedConcept() && multipleDataSourcesAvailable;        
    const multipleDataSourcesAvailable = () => this.datum.byDataSources > 1;

    if(this.context.ui.showDataSources){
      this.DOM.datasourceContainer.selectAll("span")
        .data(this.datum.byDataSources, v => v)
        .enter().append("span")
        //.text(v => v.dataSource.config.name)
        .text(v => v.dataSource.id)
        .on("mouseenter", function(event, v) {
          d3.select(this).style("background-color", getDSColorLight(v))
          _this.updateNameSection(v);
          _this.updateDescrSection(v);
        })
        .on("mouseout", function(event, v) {
          d3.select(this).style("background-color", paintBackground(v) ? getDSColorLight(v) : null)
          _this.updateNameSection();
          _this.updateDescrSection();
        })
        .on("click", function(event, v){
          if(_this.DOM.spaceContainer.select("select").node()) _this.resetPickers();
          _this.setDatasource(v);
        });
      
      this.DOM.datasourceContainer.selectAll("span")
        .style("pointer-events", this._isSelectedConcept() ? null : "none")
        .style("border-color", getDSColorDark)
        .style("background-color", v => paintBackground(v) ? getDSColorLight(v) : null);
    }
  }

  updateSpaceSection(datumForDS = this._getDatumForDS()){
    const _this = this;

    if(this.datum.id == "_default") return;

    const currentSpace = this.encoding.data.space;
    const markerSpace = this.encoding.marker.data.space;

    const multipleSpacesAvailable = () => datumForDS.spaces.length > 1;
    const shorterThanMarkerSpace = () => datumForDS.spaces[0].length < markerSpace.length;

    //only build the UI for selecting spaces if many conditions are met
    if(this._isSelectedConcept() && (multipleSpacesAvailable() || !spacesAreEqual(datumForDS.spaces[0], markerSpace) && !shorterThanMarkerSpace())) {

      const spaceSelect = this.DOM.spaceContainer
        .append("select")
        .attr("name", "vzb-select-treemenu-leaf-space")
        .attr("id", "vzb-select-treemenu-leaf-space")
        .on("change", function(){
          _this.spaceChanged = true;
          _this.updateComplimentSetters();
        });
  
      spaceSelect
        .selectAll("option")
        .data(datumForDS.spaces)
        .enter().append("option")
        .attr("value", option => option.join())
        .text(option => "by " + Utils.getSpaceName(this.encoding, option));
  
      spaceSelect
        .property("value", currentSpace.join());
      
      this.DOM.spaceContainer.append("div")
        .attr("class","vzb-treemenu-leaf-space-compliment");

      this.DOM.spaceContainer.append("div")
        .attr("class","vzb-hidden vzb-treemenu-leaf-space-reset")
        .text("Reset")
        .on("click", () => {
          this.resetPickers();
          this.setModel();
        });

      this.DOM.spaceContainer.append("div")
        .attr("class","vzb-hidden vzb-treemenu-leaf-space-apply")
        .text("Apply")
        .on("click", () => {
          this.setModel();
        });

      this.updateComplimentSetters();
    }
  }


  updateComplimentSetters() {
    const _this = this;
    const encoding = this.context._targetModel;
    const compliment = this.context.services.Vizabi.Vizabi.utils.relativeComplement(encoding.marker.data.space, this._getSelectedSpace());
    
    Utils.requestEntityNames(encoding.data.source, compliment).then(dims => {
      let dimSetters = this.DOM.spaceContainer.select("div.vzb-treemenu-leaf-space-compliment")
        .selectAll("div.vzb-treemenu-leaf-space-compliment-setter")
        .data(dims, d => d.dim);

      dimSetters.exit().remove();

      dimSetters = dimSetters
        .enter().append("div")
        .attr("class", "vzb-treemenu-leaf-space-compliment-setter")
        .each(function(d) {
          const view = d3.select(this);
          view
            .append("label")
            .attr("for", d.dim + "_extraDim")
            .text(Utils.getSpaceName(encoding, d.dim) + ":");
    
          const select = view
            .append("select")
            .attr("id", d.dim + "_extraDim")
            .on("change", () => {
              _this.spaceChanged = true;
              _this.updateResetApplyButtons();
            });

          select.selectAll("option")
            .data(d.data.raw)
            .enter().append("option")
            .attr("value", option => option[d.dim])
            .text(option => option.name);

          select.property("selectedIndex", -1);
        })
        .merge(dimSetters);


      dimSetters
        .each(function(d){
          const select = d3.select(this).select("select");
          const value = encoding.data.filter?.dimensions[d.dim]?.[d.dim];
          if (value)
            select.property("value", value);
          else
            select.property("selectedIndex", -1);
        });   
        
        
      this.updateResetApplyButtons();
    });
  }


  _getSelectedSpace() {
    const node = this.view.select("div." + css.leaf_content_item_space)
      .select("select").node();
    return d3.select(node.options[node.selectedIndex]).datum();
  }


  _getSelectedFilter() {
    const filter = {};
    let invalidFilter = false;
    this.view.select("div." + css.leaf_content_item_space)
      .select("div.vzb-treemenu-leaf-space-compliment")
      .selectAll("select")
      .each(function(d){ 
        filter[d.dim] = {};
        filter[d.dim][d.dim] = this.value;
        if(this.selectedIndex == -1) invalidFilter = true;
      });
    return invalidFilter ? null : filter;
  }


  updateResetApplyButtons(datumForDS = this._getDatumForDS()) {
    const currentSpace = this.context.targetModel().data.space;
    const defaultSpace = this.context.getNearestSpaceToMarkerSpace(datumForDS.spaces);

    const selectedSpace = this._getSelectedSpace();
    const selectedFilter = this._getSelectedFilter();

    const spaceContainer = this.view.select("div." + css.leaf_content_item_space);
    spaceContainer.select(".vzb-treemenu-leaf-space-reset")
      .classed("vzb-hidden", spacesAreEqual(currentSpace, defaultSpace));
    spaceContainer.select(".vzb-treemenu-leaf-space-apply")
      .classed("vzb-hidden", !this.spaceChanged)
      .classed("vzb-disabled", !selectedFilter && !spacesAreEqual(currentSpace, selectedSpace));
  }


  resetPickers(datumForDS = this._getDatumForDS()) {
    const defaultSpace = this.context.getNearestSpaceToMarkerSpace(datumForDS.spaces);
    
    this.view.select("div." + css.leaf_content_item_space)
      .select("select")
      .property("value", defaultSpace.join());

    this.updateComplimentSetters();
  }


  setDatasource(datumForDS = this._getDatumForDS()){
    const encoding = this.context._targetModel;
    runInAction(()=>{
      encoding.data.config.source = datumForDS.dataSource.id;
    });
  }
  
  setModel() {
    const encoding = this.context._targetModel;
    const selectedSpace = this._getSelectedSpace();
    const selectedFilter = this._getSelectedFilter() || {};

    runInAction(()=>{
      encoding.data.config.space = selectedSpace;
      encoding.data.filter.config.dimensions = selectedFilter;
    });
  }
}
