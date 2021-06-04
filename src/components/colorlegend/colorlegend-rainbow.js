import axisSmart from "../../legacy/helpers/d3.axisWithLabelPicker";
import * as utils from "../../legacy/base/utils";
import { runInAction } from "mobx";

const CIRCLE_RADIUS = 6;

export function updateRainbowLegend(isVisible) {
  const DOM = this.DOM;
  
  //Hide rainbow element if showing minimap or if color is discrete
  DOM.rainbowHolder.classed("vzb-hidden", !isVisible);
  if (!isVisible) return;
  
  const localise = this.localise;
  const colorModel = this.MDL.color.scale;
  const gradientWidth = DOM.rainbow.node().getBoundingClientRect().width;
  const paletteKeys = colorModel.palette.paletteDomain.map(parseFloat);
  const paletteLabels = colorModel.palette.paletteLabels;
  const cScale = colorModel.d3Scale.copy();
    
  const marginLeft = parseInt(DOM.rainbow.style("left"), 10) || 0;
  const marginRight = parseInt(DOM.rainbow.style("right"), 10) || marginLeft;
  
  let domain, range, paletteMax;
  
  if (paletteLabels) {
    domain = paletteLabels.map(val => parseFloat(val));
    paletteMax = d3.max(domain);
    range = domain.map(val => val / paletteMax * gradientWidth);
  } else {
    domain = cScale.domain();
    paletteMax = d3.max(paletteKeys);
    range = paletteKeys.map(val => val / paletteMax * gradientWidth);
  }

  const labelsAxis = axisSmart("bottom");
  const labelScale = cScale.copy()
    .interpolate(d3.interpolate)
    .range(range);

  const edgeDomain = d3.extent(domain);

  const domainScale = labelScale.copy()
    .domain(edgeDomain)
    .range(edgeDomain);

  const paletteScaleLinear = d3.scaleLinear()
    .domain(edgeDomain)
    .range([0, 100]);

  updateLabelScale();
  updateRainbowCanvas();
  updateSubtitle();

  if (DOM.rainbowLegend.style("display") !== "none")
    updateColorStops();


  function updateLabelScale(){

    DOM.labelScaleSVG.style("width", marginLeft + gradientWidth + marginRight + "px");
    DOM.labelScaleG.attr("transform", "translate(" + marginLeft + ",2)");
    
    labelsAxis
      .scale(labelScale)
      .tickSizeOuter(5)
      .tickPadding(8)
      .tickSizeMinor(3, -3)
      .labelerOptions({
        scaleType: colorModel.type,
        toolMargin: {
          right: marginRight,
          left: marginLeft
        },
        showOuter: false,
        formatter: localise,
        bump: marginLeft,
        cssFontSize: "8px",
        fitIntoScale: paletteLabels ? "optimistic" : null
      });

    DOM.labelScaleG.call(labelsAxis);
  }


  function updateRainbowCanvas(){
    DOM.rainbow
      .style("top", 3 + CIRCLE_RADIUS + "px");

    DOM.rainbowCanvas
      .attr("width", gradientWidth)
      .attr("height", 1)
      .style("width", gradientWidth + "px")
      .style("height", "100%");

    const context = DOM.rainbowCanvas.node().getContext("2d");
    const image = context.createImageData(gradientWidth, 1);
    for (let i = 0, j = -1, c; i < gradientWidth; ++i) {
      c = d3.rgb(cScale(labelScale.invert(i)));
      image.data[++j] = c.r;
      image.data[++j] = c.g;
      image.data[++j] = c.b;
      image.data[++j] = 255;
    }
    context.putImageData(image, 0, 0);

  }
  
  
  function updateSubtitle(){
    const conceptProps = colorModel.parent.data.conceptProps;
    const subtitle = utils.getSubtitle(conceptProps.name, conceptProps.name_short);
  
    DOM.subtitleText
      .classed("vzb-hidden", subtitle == "")
      .text(subtitle);

    DOM.subtitleReset
      .text(localise("buttons/reset"))
      .classed("vzb-hidden", !Object.keys(colorModel.palette.config.palette).length)
      .on("click", () => {
        runInAction(()=>{
          Object.keys(colorModel.palette.config.palette)
            .forEach(d => colorModel.palette.removeColor(d));
        });
      });
  }


  function updateColorStops(){

    DOM.rainbowLegend
      .style("width", gradientWidth + "px")
      .style("left", (marginLeft - CIRCLE_RADIUS) + "px")
      .style("top", "3px");

    DOM.labelScale.selectAll(".vzb-axis-value text")
      .attr("dy", "1.5em");

    DOM.rainbowLegendEventArea
      .style("width", gradientWidth + "px")
      .style("top", 3 + CIRCLE_RADIUS + "px")
      .style("left", CIRCLE_RADIUS + "px")
      .on("mousemove", function() {
        highlightValue(labelScale.invert(d3.mouse(this)[0]));
      })
      .on("mouseleave", () => highlightValue("none"))
      .on("dblclick", function() {
        let x = d3.mouse(this)[0];
        x = x <= (CIRCLE_RADIUS * 2) ? CIRCLE_RADIUS * 2 : x >= (gradientWidth - CIRCLE_RADIUS * 2) ? gradientWidth - CIRCLE_RADIUS * 2 : x;
        const newValue = labelScale.invert(x);
        const color = cScale(newValue);
        const paletteKey = getPaletteKey(newValue);
        colorModel.palette.setColor(color, paletteKey);
      });

    if (!d3.extent(domain).includes(0)) {
      //find tick with zero
      DOM.labelScaleG.selectAll(".tick text")
        .filter(function() { return d3.select(this).text() === "0"; })
        .style("cursor", "pointer")
        .on("dblclick", () => {
          const color = cScale(0);
          const paletteKey = getPaletteKey(0);
          colorModel.palette.setColor(color, paletteKey);
        });
    }

    const value0 = d3.min(domain) < 0 && d3.max(domain) > 0 ? labelScale(0) : null;
    const colorStops = domain.map((val, i) => ({ 
      val, 
      i, 
      value0,
      isEdgePoint: i === 0 || i === domain.length - 1,
      color: cScale.range()[i],
      paletteKey: paletteKeys[i],
      xMin: i - 1 < 0 ? 1 : labelScale(domain[i - 1]) + CIRCLE_RADIUS * 2,
      xMax: i + 1 >= domain.length ? gradientWidth - 1 : labelScale(domain[i + 1]) - CIRCLE_RADIUS * 2
    }));
      

    let dblclick = false;
    let lastClickId;

    let rainbowLegendCircles = DOM.rainbowLegend.selectAll(".vzb-cl-rainbow-legend-circle")
      .data(colorStops, d => d.i);
    rainbowLegendCircles.exit().remove();
    rainbowLegendCircles = rainbowLegendCircles.enter().append("div")
      .attr("class", "vzb-cl-rainbow-legend-circle")
      .style("width", 2 * CIRCLE_RADIUS + "px")
      .style("height", 2 * CIRCLE_RADIUS + "px")
      .style("border", "1px solid #000")
      .each(function(){
        d3.select(this).append("input")
          .attr("type", "color");
      })
      .merge(rainbowLegendCircles);
        
    rainbowLegendCircles
      .style("border-radius", d => d.isEdgePoint ? null : (CIRCLE_RADIUS + "px"))
      .call(dragCircles())
      .on("mouseenter", d => {
        highlightValue(d.val);
      })
      .on("mouseleave", () => {
        highlightValue("none");
      })
      .on("click", function(){
        const input = d3.select(this).select("input").node();
        lastClickId = setTimeout(() => {
          if (!dblclick){
            input.click();
          } else {
            clearTimeout(lastClickId);
            dblclick = false;
          }
        }, 500);
      })
      .on("dblclick", function(d){
        dblclick = true;
        if (d.isEdgePoint) return;
        removeColor(d.paletteKey);
      })
      .each(function(d) {
        d3.select(this).select("input").property("value", d.color)
          .on("click", ()=>{d3.event.stopPropagation();})
          .on("input", function(){
            const value = d3.select(this).property("value");
            setColor(value, d.paletteKey);
          });
        d3.select(this).style("left", (d.x = labelScale(d.val)) + "px");
      });
  }


  function dragCircles() {
    return d3.drag()
      .on("start", function start() {

        const circle = d3.select(this);
        let dragged = false;

        circle.classed("dragging", true);

        d3.event.on("drag", drag).on("end", end);

        function drag(d) {
          if (d.isEdgePoint) return;
          if (d3.event.x < 0) return;
          if (d3.event.x > gradientWidth) return;
          if (d3.event.x < d.xMin || d3.event.x > d.xMax) return;
          if (!dragged && d3.event.dx !== 0) dragged = true;

          d.x = d3.event.x;
          if (d.value0 !== null) {
            d.x = (d.x < d.value0 - 3 || d.x > d.value0 + 3) ? d.x : d.value0;
          }

          circle.style("left", d.x + "px");

          if (dragged) {
            const newValue = labelScale.invert(d.x);
            const paletteKey = getPaletteKey(newValue);
            highlightValue(newValue);

            if(d.paletteKey !== paletteKey){
              replaceColor(d.color, d.paletteKey, paletteKey);                
              d.val = newValue;
              d.paletteKey = paletteKey;
            }
          }
        }

        function end() {
          circle.classed("dragging", false);
        }
      });
  }


  function getPaletteKey(value){
    return Math.round(+paletteScaleLinear(domainScale(value)));
  }


  function highlightValue(value){
    DOM.labelScaleG.call(labelsAxis.highlightValue(value));
  }


  function setColor(value, key){
    colorModel.palette.setColor(value, key);
  }


  function removeColor(key){
    if (colorModel.palette.defaultPalette[key])
      colorModel.palette.setColor(null, key);    
    else 
      colorModel.palette.removeColor(key);  
  }


  function replaceColor(value, oldKey, newKey){
    runInAction(()=>{
      removeColor(oldKey);
      setColor(value, newKey);
    });
  }
}