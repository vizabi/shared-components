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
        space: ["destination", "origin", "year"]
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
            concept: "migration_stock"
          }
        },
        "lat": {
          data: {
            space: ["destination"],
            concept: "latitude"
          }
        },
        "lon": {
          data: {
            space: ["destination"],
            concept: "longitude"
          }
        },
        "color": {
          data: {
            space: ["destination"],
            concept: "world_4region"
          },
          scale: {
            type: "ordinal"
          }
        },
        "label": {
          data: {
            space: ["destination"],
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
        space: ["destination", "origin", "year"]
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
            concept: "migration_stock"
          }
        },
        "lat": {
          data: {
            space: ["origin"],
            concept: "latitude"
          }
        },
        "lon": {
          data: {
            space: ["origin"],
            concept: "longitude"
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
            concept: "year"
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
