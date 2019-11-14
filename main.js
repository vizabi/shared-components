var ddfcsv = new DDFCsvReader.getDDFCsvReaderObject();
Vizabi.stores.dataSources.createAndAddType("ddfcsv", ddfcsv);


const data = {
  modelType: "ddfcsv",
  path: "./data/ddf--unhcr--population_statistics/"
};

// var config = {
//   markers: {
//     marker_destination: {
//       data: {
//         locale: "en",
//         source: data,
//         space: ["asylum_residence", "time"]
//       },
//       encoding: {
//         "selected": {
//           modelType: "selection"
//         },
//         "highlighted": {
//           modelType: "selection"
//         },
//         "x": {
//           data: {
//             concept: "displaced_population"
//           }
//         },
//         "color": {
//           data: {
//             space: ["asylum_residence"],
//             concept: "world_4region"
//           },
//           scale: {
//             type: "ordinal"
//           }
//         },
//         "label": {
//           data: {
//             space: ["asylum_residence"],
//             concept: "name"
//           }
//         },
//         "frame": {
//           modelType: "frame",
//           speed: 200,
//           value: 2005,
//           data: {
//             concept: "time"
//           }
//         }
//       }
//     },
//     marker_origin: {
//       data: {
//         locale: "en",
//         source: data,
//         space: ["origin", "time"]
//       },
//       encoding: {
//         "selected": {
//           modelType: "selection"
//         },
//         "highlighted": {
//           modelType: "selection"
//         },
//         "x": {
//           data: {
//             concept: "displaced_population"
//           }
//         },
//         "color": {
//           data: {
//             space: ["origin"],
//             concept: "world_4region"
//           },
//           scale: {
//             type: "ordinal"
//           }
//         },
//         "label": {
//           data: {
//             space: ["origin"],
//             concept: "name"
//           }
//         },
//         "frame": {
//           modelType: "frame",
//           speed: 200,
//           value: 2005,
//           data: {
//             concept: "time"
//           }
//         }
//       }
//     },
//     marker_cross: {
//       data: {
//         locale: "en",
//         source: data,
//         space: ["origin", "asylum_residence", "time"]
//       },
//       encoding: {
//         "x": {
//           data: {
//             concept: "displaced_population"
//           }
//         },
//         // "frame": {
//         //   modelType: "frame",
//         //   speed: 200,
//         //   data: {
//         //     concept: "time"
//         //   }
//         // }
//       }
//     }
//   }
// };

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
        "size": {
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
        "lat": {
          data: {
            space: ["asylum_residence"],
            concept: "latitude"
          }
        },
        "lon": {
          data: {
            space: ["asylum_residence"],
            concept: "longitude"
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
        "size": {
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
        "size": {
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

var viz = new BubbleMap({
  placeholder: "#root",
  model: model
});
