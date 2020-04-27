export const STATUS = {
  INIT: "init", 
  PENDING: "pending", 
  READY: "fulfilled", 
  ERROR: "error"
};

export function isEntityConcept(concept) {
  return ["entity_set", "entity_domain"].includes(concept.concept_type);
};

export function getConceptProps(model, localise) {
  if (model.data.isConstant()) {
      return ({
          name: localise("indicator/" + model.data.constant + "/" + model.scale.modelType)
      });
  } else {
      return model.data.conceptProps;
  }
}
