
import { css } from "./config";
import { runInAction } from "mobx";
import * as utils from "../../legacy/base/utils";
import * as Utils from "../../utils";

function spacesAreEqual(a, b){
  return a.concat().sort().join() === b.concat().sort().join();
}
export class DeepLeaf{

  constructor(context, entity){
    this.context = context;
    this.entity = entity;
    this.spaceChanged = false;

    this.buildLeaf();
  }
  
  buildLeaf() {
    const _this = this;
    const leafDatum = this.entity.datum();
    const encoding = this.context._targetModel;

    this.entity.selectAll("div").remove();

    const leafContent = this.entity
      .append("div").classed(css.leaf + " " + css.leaf_content + " vzb-dialog-scrollable", true)
      .style("width", this.width + "px");

    leafContent.append("div")
      .classed(css.leaf_content_item + " " + css.leaf_content_item_title, true)
      .text(utils.replaceNumberSpacesToNonBreak(leafDatum.name) || "");
    const spaceContainer = leafContent.append("div")
      .classed(css.leaf_content_item + " " + css.leaf_content_item_space, true)
      .on("click", ()=>{
        d3.event.stopPropagation();
      });
    leafContent.append("div")
      .classed(css.leaf_content_item + " " + css.leaf_content_item_descr, true)
      .text(utils.replaceNumberSpacesToNonBreak(leafDatum.description) || "");
    leafContent.append("div")
      .classed(css.leaf_content_item + " " + css.leaf_content_item_helptranslate, true)
      .classed("vzb-invisible", !leafDatum.translateContributionLink)
      .html(`<a href="${leafDatum.translateContributionLink}" target="_blank">${leafDatum.translateContributionText}</a>`);

    const currentSpace = encoding.data.space;
    const markerSpace = encoding.marker.data.space;

    const isSelectedConcept = () => leafDatum.id == encoding.data.concept;
    const multipleSpacesAvailable = () => leafDatum.spaces.length > 1;
    const shorterThanMarkerSpace = () => leafDatum.spaces[0].length < markerSpace.length;

    //only build the UI for selecting spaces if many conditions are met
    if(isSelectedConcept() && (multipleSpacesAvailable() || !spacesAreEqual(leafDatum.spaces[0], markerSpace) && !shorterThanMarkerSpace())) {

      const spaceSelect = spaceContainer
        .append("select")
        .attr("name", "vzb-select-treemenu-leaf-space")
        .attr("id", "vzb-select-treemenu-leaf-space")
        .on("change", function(){
          _this.spaceChanged = true;
          _this.updateComplimentSetters();
        });
  
      spaceSelect
        .selectAll("option")
        .data(leafDatum.spaces)
        .enter().append("option")
        .attr("value", option => option.join())
        .text(option => "by " + Utils.getSpaceName(encoding, option));
  
      spaceSelect
        .property("value", currentSpace.join());
      
      spaceContainer.append("div")
        .attr("class","vzb-treemenu-leaf-space-compliment");

      spaceContainer.append("div")
        .attr("class","vzb-hidden vzb-treemenu-leaf-space-reset")
        .text("Reset")
        .on("click", () => {
          this.resetPickers();
        });

      spaceContainer.append("div")
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
    const spaceContainer = this.entity.select("div." + css.leaf_content_item_space);
    const encoding = this.context._targetModel;
    const compliment = this.context.services.Vizabi.Vizabi.utils.relativeComplement(encoding.marker.data.space, this.getSelectedSpace());
    
    Utils.requestEntityNames(encoding.data.source, compliment).then(dims => {
      let dimSetters = spaceContainer.select("div.vzb-treemenu-leaf-space-compliment")
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
              _this.updateResetApply();
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
        
        
      this.updateResetApply();
    });
  }


  getSelectedSpace() {
    const node = this.entity.select("div." + css.leaf_content_item_space)
      .select("select").node();
    return d3.select(node.options[node.selectedIndex]).datum();
  }


  getSelectedFilter() {
    const filter = {};
    let invalidFilter = false;
    this.entity.select("div." + css.leaf_content_item_space)
      .select("div.vzb-treemenu-leaf-space-compliment")
      .selectAll("select")
      .each(function(d){ 
        filter[d.dim] = {};
        filter[d.dim][d.dim] = this.value;
        if(this.selectedIndex == -1) invalidFilter = true;
      });
    return invalidFilter ? null : filter;
  }


  updateResetApply() {
    const currentSpace = this.context.targetModel().data.space;
    const defaultSpace = this.context.getNearestSpaceToMarkerSpace(this.entity.datum().spaces);

    const selectedSpace = this.getSelectedSpace();
    const selectedFilter = this.getSelectedFilter();

    const spaceContainer = this.entity.select("div." + css.leaf_content_item_space);
    spaceContainer.select(".vzb-treemenu-leaf-space-reset")
      .classed("vzb-hidden", spacesAreEqual(currentSpace, defaultSpace));
    spaceContainer.select(".vzb-treemenu-leaf-space-apply")
      .classed("vzb-hidden", !this.spaceChanged)
      .classed("vzb-disabled", !selectedFilter && !spacesAreEqual(currentSpace, selectedSpace));
  }


  resetPickers() {
    const defaultSpace = this.context.getNearestSpaceToMarkerSpace(this.entity.datum().spaces);
    
    this.entity.select("div." + css.leaf_content_item_space)
      .select("select")
      .property("value", defaultSpace.join());

    this.updateComplimentSetters();
    this.setModel();
  }

  
  setModel() {
    const encoding = this.context._targetModel;
    const selectedSpace = this.getSelectedSpace();
    const selectedFilter = this.getSelectedFilter() || {};

    runInAction(()=>{
      encoding.data.config.space = selectedSpace;
      encoding.data.filter.config.dimensions = selectedFilter;
    });
  }
}
