import axisSmart from "../../legacy/helpers/d3.axisWithLabelPicker";
import * as utils from "../../legacy/base/utils";
import { runInAction } from "mobx";
import * as d3 from "d3";

const CIRCLE_RADIUS = 6;

export function updateRainbowLegend(isVisible) {
  const _this = this;
  const DOM = this.DOM;
  
  //Hide rainbow element if showing minimap or if color is discrete
  DOM.rainbowHolder.classed("vzb-hidden", !isVisible);
  const gradientWidth = DOM.rainbow.node().getBoundingClientRect().width;
  const gradientHeight = 20;
  if (!isVisible || !gradientWidth) return;
  
  const localise = this.services.locale.auto({shareOrPercent: this.MDL.color.data?.conceptProps?.format});
  const colorModel = this.MDL.color.scale;
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
  if (domain.length) updateRainbowCanvas();
  updateHint();
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


  function addArrowToCanvas({ctx, direction = "LEFT", w = 30, h = gradientHeight, y0 = gradientHeight/2, x0 = 0}){
    const margin_x = 2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if(direction === "LEFT"){
      ctx.moveTo(x0 + margin_x + w/3, y0 - h/2);
      ctx.lineTo(x0 + margin_x, y0);
      ctx.lineTo(x0 + margin_x + w/3, y0 + h/2);
      ctx.moveTo(x0 + margin_x, y0);
      ctx.lineTo(x0 + margin_x + w, y0);
    } else {
      ctx.moveTo(x0 - margin_x - w/3, y0 - h/2);
      ctx.lineTo(x0 - margin_x, y0);
      ctx.lineTo(x0 - margin_x - w/3, y0 + h/2);
      ctx.moveTo(x0 - margin_x, y0);
      ctx.lineTo(x0 - margin_x - w, y0);
    }
    ctx.stroke();
  }

  function updateHint(){
    const hltFilter = _this.MDL.highlighted.data.filter;
    const canvas = DOM.rainbowOutliers.node();
    const ctx = canvas.getContext("2d");

    //only one mark is highlighted and the dialog is visible
    if(hltFilter.markers.size === 1 && isVisible) {

      DOM.rainbowOutliers
        .attr("width", gradientWidth + 15 + 15)
        .attr("height", gradientHeight)
        .style("width", (gradientWidth + 15 + 15) + "px")
        .style("height", gradientHeight + "px");


      if (window.devicePixelRatio > 1) {
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
    
        canvas.width = canvasWidth * window.devicePixelRatio;
        canvas.height = canvasHeight * window.devicePixelRatio;
        canvas.style.width = canvasWidth + "px";
        canvas.style.height = canvasHeight + "px";
    
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      const key = hltFilter.markers.keys().next().value;
      const value = _this.model.dataMap.getByStr(key)?.[_this.colorModelName];
      const x = labelScale(value);

      const marginLeft = 15;
      const marginRight = 15;
    
      if(x > 0 && x < gradientWidth) 
        ctx.fillRect(x + marginLeft - 1, 0, 2, gradientHeight);     
      else if(x <= 0)
        addArrowToCanvas({ctx, direction: "LEFT", x0: 0});
      else if (x >= gradientWidth) 
        addArrowToCanvas({ctx, direction: "RIGHT", x0: gradientWidth + marginLeft + marginRight});
      
      //add highlighted value in axis
      DOM.labelScaleG.call(labelsAxis.highlightValue(value));
    } else {
      //remove highlighted value in axis
      DOM.labelScaleG.call(labelsAxis.highlightValue("none"));
      ctx.clearRect(0, 0, gradientWidth + marginLeft + marginRight, gradientHeight);
    }
    return hltFilter;
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
      .text(conceptProps.name_short ? subtitle : "");

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
      .attr("dy", "1em");

    DOM.rainbowLegendEventArea
      .style("width", gradientWidth + "px")
      .style("top", 3 + CIRCLE_RADIUS + "px")
      .style("left", CIRCLE_RADIUS + "px")
      .on("mousemove", function(event) {
        highlightValue(labelScale.invert(d3.pointer(event)[0]));
      })
      .on("mouseleave", () => highlightValue("none"))
      .on("dblclick", function(event) {
        let x = d3.pointer(event)[0];
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
      .on("dblclick", function(event, d){
        dblclick = true;
        if (d.isEdgePoint) return;
        removeColor(d.paletteKey);
      })
      .each(function(d) {
        d3.select(this).select("input").property("value", d.color)
          .on("click", (event)=>{event.stopPropagation();})
          .on("input", function(){
            const value = d3.select(this).property("value");
            setColor(value, d.paletteKey);
          });
        d3.select(this).style("left", (d.x = labelScale(d.val)) + "px");
      });
  }


  function dragCircles() {
    return d3.drag()
      .on("start", function start(event) {

        const circle = d3.select(this);
        let dragged = false;

        circle.classed("dragging", true);

        event.on("drag", drag).on("end", end);

        function drag(event, d) {
          if (d.isEdgePoint) return;
          if (event.x < 0) return;
          if (event.x > gradientWidth) return;
          if (event.x < d.xMin || event.x > d.xMax) return;
          if (!dragged && event.dx !== 0) dragged = true;

          d.x = event.x;
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