
import { css } from "./config";
import { runInAction } from "mobx";
import * as utils from "../../legacy/base/utils";

export class DeepLeaf{

  constructor(context, entity){
    this.context = context;
    this.entity = entity;

    this.buildLeaf();
  }
  
  buildLeaf() {
    const leafDatum = this.entity.datum();
    const _this = this;

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

    if(leafDatum.id == _this.context.targetModel().data.concept) {
      const currentSpace = _this.context.targetModel().data.space;

      const spaceSelect = spaceContainer
        .append("select")
        .attr("name", "vzb-select-treemenu-leaf-space")
        .attr("id", "vzb-select-treemenu-leaf-space")
        .on("change", function(){
          _this.updateComplimentSetters();
        });
  
      spaceSelect
        .selectAll("option")
        .data(leafDatum.spaces)
        .enter().append("option")
        .attr("value", option => option.join())
        .text(option => "by " + option.join(", "));
  
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
    const compliment = this.context.services.Vizabi.Vizabi.utils.relativeComplement(encoding.marker.data.space, this.getSelectedSpace())
      .map(dim => ({ dim, encoding }));
    
    const promises = compliment.map(d => {
      return d.encoding.data.source.query({
        select: {
          key: [d.dim],
          value: ["name"]
        },
        from: "entities"
      }).then(data => {
        return { data, dim: d.dim };
      });
    });

    Promise.all(promises).then(dims => {
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
            .text(d.dim + ":");
    
          const select = view
            .append("select")
            .attr("id", d.dim + "_extraDim")
            .on("change", () => {
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
    const markerSpace = this.context.targetModel().marker.data.space;

    const selectedSpace = this.getSelectedSpace();
    const selectedFilter = this.getSelectedFilter();

    const hidden = markerSpace.join() == selectedSpace.join();

    const spaceContainer = this.entity.select("div." + css.leaf_content_item_space);
    spaceContainer.select(".vzb-treemenu-leaf-space-reset")
      .classed("vzb-hidden", hidden);
    spaceContainer.select(".vzb-treemenu-leaf-space-apply")
      .classed("vzb-hidden", hidden)
      .classed("vzb-disabled", !selectedFilter);
    
  }


  resetPickers() {
    const markerSpace = this.context.targetModel().marker.data.space;
    this.entity.select("div." + css.leaf_content_item_space)
      .select("select")
      .property("value", markerSpace.join());

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
