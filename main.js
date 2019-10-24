var ddfcsv = new DDFCsvReader.getDDFCsvReaderObject();
Vizabi.stores.dataSources.createAndAddType("ddfcsv", ddfcsv);


const data = {
    modelType: "ddfcsv",
    path: "./data/ddf--jheeffer--mdtest/"
};

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
      speed: 200,
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

var ui = Vizabi.mobx.observable({
//ui
  "time-slider": {
    "show_value": true
  },
  "buttons": {
    "buttons": ["colors", "find", "moreoptions", "presentation", "sidebarcollapse", "fullscreen"],
  },
  "dialogs": {
    "popup": ["timedisplay", "colors", "find", "moreoptions"],
    "sidebar": ["timedisplay", "colors", "find"],
    "moreoptions": ["opacity", "speed", "colors", "presentation", "about"]
  },

});

Vizabi.mobx.autorun(() => {
  console.log(JSON.stringify(ui));
})

var viz = new BarrankChart({
  placeholder: "#root",
  model: marker,
  ui: ui
});

