var ddfcsv = new DDFCsvReader.getDDFCsvReaderObject();
Vizabi.stores.dataSources.createAndAddType("ddfcsv", ddfcsv);


const data = {
  modelType: "ddfcsv",
  path: "./data/ddf--unhcr--population_statistics/"
};

var color1 = {
  data: {
    space: ["asylum_residence"],
    concept: "world_4region"
  },
  scale: {
    type: "ordinal"
  }
};


var label1 = {
  data: {
    space: ["asylum_residence"],
    concept: "name"
  }
};

var frame1 = {
  modelType: "frame",
  speed: 200,
  data: {
    concept: "time"
  }
};


var color2 = {
  data: {
    space: ["origin"],
    concept: "world_4region"
  },
  scale: {
    type: "ordinal"
  }
};


var label2 = {
  data: {
    space: ["origin"],
    concept: "name"
  }
};

var frame2 = {
  modelType: "frame",
  speed: 200,
  data: {
    concept: "time"
  }
};

var config = {
  encodings: {
    frame: {
      modelType: "frame",
      speed: 200,
      data: {
        concept: "time"
      }
    }
  },
  markers: {
    marker_destination: {
      data: {
        locale: "en",
        source: data,
        space: ["asylum_residence", "time"]
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
            concept: "displaced_population"
          }
        },
        "y": {
          data: {
            concept: "asylum_residence"
          }
        },
        "color": color1,
        "label": label1,
        "frame": "frame"
      }
    },
    marker_origin: {
      data: {
        locale: "en",
        source: data,
        space: ["origin", "time"]
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
            concept: "displaced_population"
          }
        },
        "y": {
          data: {
            concept: "asylum_residence"
          }
        },
        "color": color2,
        "label": label2,
        "frame": "frame"
      }
    }
  }
};

var model = Vizabi(config);

var viz = new BarrankChart({
  placeholder: "#root",
  model: model
});
