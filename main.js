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
    "selected": {
      modelType: "selection"
    },
    "highlighted": {
      modelType: "selection"
    },
    "x": {
      data: {
        concept: "population_total"
      }
    },
    "y": {
      data: {
        concept: "country"
      }
    },
    "color": {
      data: {
        space: ["country"],
        concept: "world_4region"
      },
      scale: {
        type: "ordinal"
      }
    },
    "label": {
      data: {
        space: ["country"],
        concept: "name"
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

var viz = new BarrankChart({
  placeholder: "#root",
  model: marker
});

