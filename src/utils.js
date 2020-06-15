import { deepClone, deepExtend } from "./legacy/base/utils";

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

export function getDefaultStateTree(defaultState, component) {
  const _defaultState = getChildrenDefaultState(defaultState, component.DEFAULT_UI);
  component.children.forEach(child => {
    if (child.name) {
      _defaultState[child.name] = getDefaultStateTree(_defaultState[child.name], child);
    } else {
      deepExtend(_defaultState, getDefaultStateTree(_defaultState, child));
    }
  });
  return _defaultState;
}

export function getChildrenDefaultState(parent, children) {
  const cloneChildren = deepClone(children);
  return deepExtend(cloneChildren, parent);
}

export function clearEmpties(obj) {
  for (const key in obj) {
    if (!obj[key] || typeof obj[key] !== "object") {
      continue // If null or not an object, skip to the next iteration
    }

    // The property is an object
    clearEmpties(obj[key]); // <-- Make a recursive call on the nested object
    if (Object.keys(obj[key]).length === 0) {
      delete obj[key]; // The object had no properties, so delete that property
    }
  }
}