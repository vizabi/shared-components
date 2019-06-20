var ddfcsv = new DDFCsvReader.getDDFCsvReaderObject();
Vizabi.stores.dataSources.createAndAddType("ddfcsv", ddfcsv);


var data = Vizabi.dataSource({
  modelType: "ddfcsv",
  path: "./data/ddf--jheeffer--mdtest/"
});

var initialMarkerConfig = {
  data: {
    locale: "en",
    source: data,
    space: {
      autoconfig: {
        concept: {
          $nin: ["age"]
        }
      }
    }
  },
  encoding: {
    "x": {
      data: {
        concept: 'population_total'
      }
    },
    "y": {
      data: {
        concept: 'country'
      }
    },
    frame: {
      modelType: "frame",
      data: {
        concept: {
          autoconfig: {
            concept_type: "time"
          }
        }
      }
    }
  }
};

var marker = Vizabi.marker(initialMarkerConfig);

var barrankChart = new BarrankChart({
  placeholder: "#root",
  model: marker
});


// new BaseComponent({
//   placeholder: "#root",
//   services: {
//     translation: new TranslationService(),
//     layout: new LayOutService()
//   },
//   subcomponents: [{
//       component: VegaBarchart,
//       placeholder: "#chart",
//       model: marker
//     },{
//       component: timeSlider,
//       placeholder: "#timeslider",
//       model: marker
//   }],
//   template: "<div id=\"chart\"></div><div id=\"timeSlider\"></div>"
// })
