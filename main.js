var ddfReader = DDFServiceReader.getReader(); //reader config that's not dataset specific goes here
Vizabi.stores.dataSources.createAndAddType("ddfBW", ddfReader);

const data = {
  modelType: "ddfBW",
  service: "https://big-waffle-noproxy.gapminder.org",
  name: "unhcrTEST" // e.g. version could also be in here, parsers: {time: yearAsInt => new Date(Date.UTC(+yearAsInt, 0))}
};

var config = {
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
        "color": {
          data: {
            space: ["asylum_residence"],
            concept: "world_4region"
          },
          scale: {
            type: "ordinal"
          }
        },
        "label": {
          data: {
            space: ["asylum_residence"],
            concept: "name"
          }
        },
        "frame": {
          modelType: "frame",
          speed: 200,
          value: 2005,
          data: {
            concept: "time"
          }
        }
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
        "color": {
          data: {
            space: ["origin"],
            concept: "world_4region"
          },
          scale: {
            type: "ordinal"
          }
        },
        "label": {
          data: {
            space: ["origin"],
            concept: "name"
          }
        },
        "frame": {
          modelType: "frame",
          speed: 200,
          value: 2005,
          data: {
            concept: "time"
          }
        }
      }
    },
    marker_cross: {
      data: {
        locale: "en",
        source: data,
        space: ["origin", "asylum_residence", "time"]
      },
      encoding: {
        "x": {
          data: {
            concept: "displaced_population"
          }
        },
        // "frame": {
        //   modelType: "frame",
        //   speed: 200,
        //   data: {
        //     concept: "time"
        //   }
        // }
      }
    }
  }
};

var model = Vizabi(config);

var viz = new BarrankChart({
  placeholder: "#root",
  model: model
});
