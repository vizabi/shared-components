var ddfBW = new DDFServiceReader.getReader();
Vizabi.stores.dataSources.createAndAddType("ddfBW", ddfBW);


const data = {
  modelType: "ddfBW",
  name: "migrantsTEST"
};
var config = {
  markers: {
    marker_destination: {
      data: {
        locale: "en",
        source: data,
        space: ["geo", "year"]
      },
      encoding: {
        "selected": {
          modelType: "selection"
        },
        "highlighted": {
          modelType: "selection"
        },
        "size": {
          data: {
            concept: "immigrant_stock"
          }
        },
        "lat": {
          data: {
            space: ["geo"],
            concept: "latitude"
          }
        },
        "lon": {
          data: {
            space: ["geo"],
            concept: "longitude"
          }
        },
        "color": {
          data: {
            space: ["geo"],
            concept: "world_4region"
          },
          scale: {
            type: "ordinal"
          }
        },
        "label": {
          data: {
            space: ["geo"],
            concept: "name"
          }
        },
        "frame": {
          modelType: "frame",
          speed: 200,
          value: 2005,
          data: {
            concept: "year"
          }
        }
      }
    },
    marker_origin: {
      data: {
        locale: "en",
        source: data,
        space: ["geo", "year"]
      },
      encoding: {
        "selected": {
          modelType: "selection"
        },
        "highlighted": {
          modelType: "selection"
        },
        "size": {
          data: {
            concept: "emigrant_stock"
          }
        },
        "lat": {
          data: {
            space: ["geo"],
            concept: "latitude"
          }
        },
        "lon": {
          data: {
            space: ["geo"],
            concept: "longitude"
          }
        },
        "color": {
          data: {
            space: ["geo"],
            concept: "world_4region"
          },
          scale: {
            type: "ordinal"
          }
        },
        "label": {
          data: {
            space: ["geo"],
            concept: "name"
          }
        },
        "frame": {
          modelType: "frame",
          speed: 200,
          value: 2005,
          data: {
            concept: "year"
          }
        }
      }
    },
    marker_cross: {
      data: {
        locale: "en",
        source: data,
        space: ["destination", "origin", "year"]
      },
      encoding: {
        "size": {
          data: {
            concept: "migration_stock"
          }
        }
      }
    }
  }
};

var model = Vizabi(config);

var viz = new BubbleMap({
  placeholder: "#root",
  model: model
});
