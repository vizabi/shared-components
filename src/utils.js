import { deepClone, deepExtend } from "./legacy/base/utils";

export const STATUS = {
  INIT: "init", 
  PENDING: "pending", 
  READY: "fulfilled", 
  ERROR: "error"
};

export function isEntityConcept(concept = {}) {
  return ["entity_set", "entity_domain"].includes(concept.concept_type);
}

export function getConceptName(enc, localise) {
  const cp = enc.data.conceptProps;

  if (enc.data.isConstant()) 
    return localise("indicator/" + enc.data.constant + "/" + enc.scale.modelType);

  return cp.name || cp.concept || localise(enc.name);
}

export function getConceptShortName(enc, localise) {
  const cp = enc.data.conceptProps;

  if (enc.data.isConstant()) 
    return localise("indicator/" + enc.data.constant + "/" + enc.scale.modelType);
    
  return cp.name_short || getConceptName(enc, localise);
}

export function getConceptNameMinusShortName(enc, localise) {
  const name = getConceptName(enc, localise);
  const shortName = getConceptShortName(enc, localise);

  if (enc.data.isConstant()) 
    return name;

  let result = name.replace(shortName,"");

  //remove leading comma if present
  if (result[0] === ",") result = result.slice(1);

  result = result.trim();

  //remove brackets if string starts with "(" and ends with ")"
  const regexpResult = /^\((.*)\)$|.*/.exec(result);
  return regexpResult[1] || regexpResult[0] || "";
}

export function getConceptUnit(enc) {
  const cp = enc.data.conceptProps;
  return cp && cp.unit || "";
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
    if (!obj[key] || typeof obj[key] !== "object" || obj[key] instanceof Date) {
      continue // If null or not an object, skip to the next iteration
    }

    // The property is an object
    clearEmpties(obj[key]); // <-- Make a recursive call on the nested object
    if (Object.keys(obj[key]).length === 0) {
      delete obj[key]; // The object had no properties, so delete that property
    }
  }
  return obj;
}

export function mergeInTarget(target, source) {
  for (const key in source) {
    if (typeof source[key] === "object" && !Array.isArray(source[key]) && source[key] !== null) {
      if (target[key]) {
        mergeInTarget(target[key], source[key]);
      } else {
        target[key] = deepExtend({}, source[key]);
      }
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function replaceProps(target, source) {
  for (const key in target) {
    if (typeof target[key] === "object" && !Array.isArray(target[key]) && target[key] !== null) {
      replaceProps(target[key], source[key] || {});
    } else {
      if (typeof source[key] !== "undefined") {
        target[key] = source[key];
      } else {
        delete target[key];
      }
    }
  }
  return target;
}