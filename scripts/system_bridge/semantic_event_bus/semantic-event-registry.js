/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_event_bus/semantic-event-registry.js
 */
/**
 * @file
 * @path main/semantic_event_bus/semantic-event-registry.js
 * @module semantic-event-registry
 * @layer semantic-event-bus-registry
 * @responsibility register-index-filter-and-manage-semantic-event-listeners
 * @public-boundary false
 * @side-effects listener-registration-state-only
 *
 * @depends-on
 * - semantic-event-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by semantic-event-dispatcher.js
 * - consumed by semantic-event-hooks.js
 * - consumed by semantic-event-bus.js
 * - future lifecycle_service/ registers lifecycle listeners here
 * - future actor_owned_feature_registry/ may register feature-trigger
 *   listeners here
 * - future system_bridge/ may supply listener match metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - semantic-event-contract.js owns event/listener result shapes
 * - semantic-event-dispatcher.js owns listener invocation
 * - semantic_event_bus remains communication infrastructure only
 * - execution_transaction/ remains execution sequencing authority
 *
 * THIS FILE OWNS:
 * - listener registration
 * - listener identity
 * - listener priority
 * - deterministic registration order
 * - listener matching metadata
 * - listener enable/disable
 * - once-only listener metadata
 * - listener lookup
 * - listener unregistration
 * - listener source ownership
 * - registry diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - event dispatch
 * - listener invocation
 * - listener error normalization
 * - propagation semantics execution
 * - feature-specific mechanics
 * - transaction sequencing
 *
 * EDIT CONTRACT:
 * - registry operations remain synchronous
 * - no listener callback execution here
 * - preserve deterministic priority + registration ordering
 * - support efficient kind/category/source filtering
 * - do not mutate SemanticEvent values
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  SEMANTIC_EVENT_CATEGORY,
  SEMANTIC_EVENT_SOURCE_KIND,
  createSemanticEventMatch,
  doesSemanticEventMatch
} from "./semantic-event-contract.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const SEMANTIC_EVENT_REGISTRY_MODULE_ID =
  "lancer-frame-conn.semantic-event-registry";
export const SEMANTIC_EVENT_REGISTRY_MODULE_VERSION =
  1;
/* ============================================================
   LISTENER PRIORITY
   ============================================================ */
/**
 * @section listener-priority
 *
 * Lower number executes earlier.
 */
export const SEMANTIC_EVENT_LISTENER_PRIORITY = Object.freeze({
  EARLIEST:
    -1000,
  VERY_EARLY:
    -500,
  EARLY:
    -100,
  NORMAL:
    0,
  LATE:
    100,
  VERY_LATE:
    500,
  LATEST:
    1000
});
/* ============================================================
   LISTENER SOURCE KIND
   ============================================================ */
/**
 * @section listener-source-kind
 *
 * Registry ownership / diagnostics only.
 *
 * Distinct from event.source.kind.
 */
export const SEMANTIC_EVENT_LISTENER_SOURCE_KIND =
  Object.freeze({
    CORE:
      "core",
    TRANSACTION:
      "transaction",
    RESOURCE:
      "resource",
    ACTION_ECONOMY:
      "action-economy",
    LIFECYCLE:
      "lifecycle",
    TARGETING:
      "targeting",
    ACTOR_OWNED_FEATURE:
      "actor-owned-feature",
    SYSTEM_BRIDGE:
      "system-bridge",
    FEATURE:
      "feature",
    UI:
      "ui",
    OBSERVABILITY:
      "observability",
    DEBUG:
      "debug",
    OTHER:
      "other"
  });
/* ============================================================
   PRIVATE REGISTRY STATE
   ============================================================ */
/**
 * @section private-registry-state
 *
 * Primary authority:
 *
 * listenerId → listener descriptor
 *
 * Secondary indexes:
 *
 * event kind → listener IDs
 * event category → listener IDs
 * event source kind → listener IDs
 *
 * wildcard listeners are stored separately.
 */
const LISTENERS_BY_ID =
  new Map();
const LISTENER_IDS_BY_KIND =
  new Map();
const LISTENER_IDS_BY_CATEGORY =
  new Map();
const LISTENER_IDS_BY_SOURCE_KIND =
  new Map();
const WILDCARD_LISTENER_IDS =
  new Set();
let registrationCounter =
  0;
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}
function finiteNumber(value) {
  return Number.isFinite(value);
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function freezeObject(value) {
  return Object.freeze({
    ...(isObject(value)
      ? value
      : {})
  });
}
function generateListenerId() {
  registrationCounter += 1;
  return (
    `fc-semantic-listener-${Date.now()}-` +
    `${registrationCounter}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}
function getOrCreateIndexSet(
  index,
  key
) {
  let set =
    index.get(key);
  if (!set) {
    set =
      new Set();
    index.set(
      key,
      set
    );
  }
  return set;
}
function removeFromIndex(
  index,
  key,
  listenerId
) {
  const set =
    index.get(key);
  if (!set) {
    return;
  }
  set.delete(
    listenerId
  );
  if (
    set.size === 0
  ) {
    index.delete(
      key
    );
  }
}
/* ============================================================
   LISTENER DESCRIPTOR
   ============================================================ */
/**
 * @section listener-descriptor
 *
 * handler execution belongs to semantic-event-dispatcher.js.
 */
export function createSemanticEventListener({
  id =
    generateListenerId(),
  handler,
  match = null,
  priority =
    SEMANTIC_EVENT_LISTENER_PRIORITY.NORMAL,
  once = false,
  enabled = true,
  sourceKind =
    SEMANTIC_EVENT_LISTENER_SOURCE_KIND.OTHER,
  sourceId = null,
  name = null,
  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Semantic event listener requires id."
    );
  }
  if (
    typeof handler !==
    "function"
  ) {
    throw new TypeError(
      "Semantic event listener requires handler function."
    );
  }
  if (!finiteNumber(priority)) {
    throw new TypeError(
      "Semantic event listener priority must be finite."
    );
  }
  if (
    match != null &&
    !isObject(match)
  ) {
    throw new TypeError(
      "Semantic event listener match must be object or null."
    );
  }
  if (
    !Object
      .values(
        SEMANTIC_EVENT_LISTENER_SOURCE_KIND
      )
      .includes(
        sourceKind
      )
  ) {
    throw new TypeError(
      `Invalid semantic listener source kind: ${String(sourceKind)}`
    );
  }
  const normalizedMatch =
    match
      ? createSemanticEventMatch(
          match
        )
      : createSemanticEventMatch();
  return Object.freeze({
    id,
    name:
      name ??
      id,
    handler,
    match:
      normalizedMatch,
    priority,
    once:
      Boolean(once),
    enabled:
      Boolean(enabled),
    sourceKind,
    sourceId,
    registrationOrder:
      registrationCounter,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   LISTENER INDEX CLASSIFICATION
   ============================================================ */
/**
 * @section listener-index-classification
 *
 * Listeners with no kinds/categories/sourceKinds are wildcard candidates.
 *
 * More specific actor/source/execution filters remain evaluated by
 * doesSemanticEventMatch() after candidate lookup.
 */
function indexSemanticEventListener(
  listener
) {
  const match =
    listener.match;
  let indexed =
    false;
  if (
    match.kinds &&
    match.kinds.length > 0
  ) {
    for (
      const kind of
        match.kinds
    ) {
      getOrCreateIndexSet(
        LISTENER_IDS_BY_KIND,
        kind
      )
        .add(
          listener.id
        );
      indexed =
        true;
    }
  }
  if (
    match.categories &&
    match.categories.length > 0
  ) {
    for (
      const category of
        match.categories
    ) {
      getOrCreateIndexSet(
        LISTENER_IDS_BY_CATEGORY,
        category
      )
        .add(
          listener.id
        );
      indexed =
        true;
    }
  }
  if (
    match.sourceKinds &&
    match.sourceKinds.length > 0
  ) {
    for (
      const sourceKind of
        match.sourceKinds
    ) {
      getOrCreateIndexSet(
        LISTENER_IDS_BY_SOURCE_KIND,
        sourceKind
      )
        .add(
          listener.id
        );
      indexed =
        true;
    }
  }
  if (!indexed) {
    WILDCARD_LISTENER_IDS.add(
      listener.id
    );
  }
}
function unindexSemanticEventListener(
  listener
) {
  const match =
    listener.match;
  for (
    const kind of
      match.kinds ??
      []
  ) {
    removeFromIndex(
      LISTENER_IDS_BY_KIND,
      kind,
      listener.id
    );
  }
  for (
    const category of
      match.categories ??
      []
  ) {
    removeFromIndex(
      LISTENER_IDS_BY_CATEGORY,
      category,
      listener.id
    );
  }
  for (
    const sourceKind of
      match.sourceKinds ??
      []
  ) {
    removeFromIndex(
      LISTENER_IDS_BY_SOURCE_KIND,
      sourceKind,
      listener.id
    );
  }
  WILDCARD_LISTENER_IDS.delete(
    listener.id
  );
}
/* ============================================================
   LISTENER REGISTRATION
   ============================================================ */
/**
 * @section listener-registration
 */
export function registerSemanticEventListener(
  options
) {
  const listener =
    createSemanticEventListener(
      options
    );
  if (
    LISTENERS_BY_ID.has(
      listener.id
    )
  ) {
    throw new Error(
      `Semantic event listener already registered: ${listener.id}`
    );
  }
  LISTENERS_BY_ID.set(
    listener.id,
    listener
  );
  indexSemanticEventListener(
    listener
  );
  return Object.freeze({
    id:
      listener.id,
    dispose() {
      return unregisterSemanticEventListener(
        listener.id
      );
    }
  });
}
/* ============================================================
   MULTI-LISTENER REGISTRATION
   ============================================================ */
/**
 * @section multi-listener-registration
 */
export function registerSemanticEventListeners(
  definitions
) {
  if (!Array.isArray(definitions)) {
    throw new TypeError(
      "registerSemanticEventListeners requires definitions array."
    );
  }
  const registrations =
    definitions.map(
      definition =>
        registerSemanticEventListener(
          definition
        )
    );
  return Object.freeze({
    registrations:
      Object.freeze(
        registrations
      ),
    dispose() {
      let removed =
        0;
      for (
        const registration of
          registrations
      ) {
        if (
          registration
            ?.dispose
            ?.()
        ) {
          removed +=
            1;
        }
      }
      return removed;
    }
  });
}
/* ============================================================
   LISTENER UNREGISTRATION
   ============================================================ */
/**
 * @section listener-unregistration
 */
export function unregisterSemanticEventListener(
  listenerId
) {
  if (!requiredString(listenerId)) {
    return false;
  }
  const listener =
    LISTENERS_BY_ID.get(
      listenerId
    );
  if (!listener) {
    return false;
  }
  unindexSemanticEventListener(
    listener
  );
  LISTENERS_BY_ID.delete(
    listenerId
  );
  return true;
}
/* ============================================================
   LISTENER LOOKUP
   ============================================================ */
/**
 * @section listener-lookup
 */
export function getSemanticEventListener(
  listenerId
) {
  if (!requiredString(listenerId)) {
    return null;
  }
  return (
    LISTENERS_BY_ID.get(
      listenerId
    ) ??
    null
  );
}
export function hasSemanticEventListener(
  listenerId
) {
  return Boolean(
    requiredString(listenerId) &&
    LISTENERS_BY_ID.has(
      listenerId
    )
  );
}
/* ============================================================
   LISTENER ENABLE / DISABLE
   ============================================================ */
/**
 * @section listener-enable-disable
 *
 * Listener descriptors remain immutable.
 *
 * Registry replaces the stored descriptor.
 */
export function setSemanticEventListenerEnabled(
  listenerId,
  enabled
) {
  if (
    typeof enabled !==
    "boolean"
  ) {
    throw new TypeError(
      "Semantic event listener enabled state must be boolean."
    );
  }
  const listener =
    LISTENERS_BY_ID.get(
      listenerId
    );
  if (!listener) {
    return false;
  }
  const replacement =
    Object.freeze({
      ...listener,
      enabled
    });
  LISTENERS_BY_ID.set(
    listenerId,
    replacement
  );
  return true;
}
/* ============================================================
   LISTENER MATCH UPDATE
   ============================================================ */
/**
 * @section listener-match-update
 *
 * Useful for long-lived runtime listeners whose actor/source binding
 * changes.
 */
export function setSemanticEventListenerMatch(
  listenerId,
  match
) {
  const listener =
    LISTENERS_BY_ID.get(
      listenerId
    );
  if (!listener) {
    return false;
  }
  unindexSemanticEventListener(
    listener
  );
  const replacement =
    Object.freeze({
      ...listener,
      match:
        createSemanticEventMatch(
          match ??
          {}
        )
    });
  LISTENERS_BY_ID.set(
    listenerId,
    replacement
  );
  indexSemanticEventListener(
    replacement
  );
  return true;
}
/* ============================================================
   SOURCE OWNERSHIP CLEARING
   ============================================================ */
/**
 * @section source-ownership-clearing
 *
 * Used when:
 *
 * - actor-owned feature registry refreshes
 * - runtime module unloads
 * - scene/combat-specific listeners expire
 */
export function clearSemanticEventListeners({
  sourceKind = null,
  sourceId = null
} = {}) {
  const toRemove = [];
  for (
    const listener of
      LISTENERS_BY_ID.values()
  ) {
    const sourceKindMatches =
      sourceKind == null ||
      listener.sourceKind ===
        sourceKind;
    const sourceIdMatches =
      sourceId == null ||
      listener.sourceId ===
        sourceId;
    if (
      sourceKindMatches &&
      sourceIdMatches
    ) {
      toRemove.push(
        listener.id
      );
    }
  }
  let removed =
    0;
  for (
    const listenerId of
      toRemove
  ) {
    if (
      unregisterSemanticEventListener(
        listenerId
      )
    ) {
      removed +=
        1;
    }
  }
  return removed;
}
export function clearAllSemanticEventListeners() {
  const count =
    LISTENERS_BY_ID.size;
  LISTENERS_BY_ID.clear();
  LISTENER_IDS_BY_KIND.clear();
  LISTENER_IDS_BY_CATEGORY.clear();
  LISTENER_IDS_BY_SOURCE_KIND.clear();
  WILDCARD_LISTENER_IDS.clear();
  return count;
}
/* ============================================================
   CANDIDATE LISTENER RESOLUTION
   ============================================================ */
/**
 * @section candidate-listener-resolution
 *
 * Build broad candidate set using secondary indexes.
 *
 * Final structural match is still applied afterward.
 */
function getCandidateListenerIds(
  event
) {
  const ids =
    new Set(
      WILDCARD_LISTENER_IDS
    );
  const byKind =
    LISTENER_IDS_BY_KIND.get(
      event.kind
    );
  if (byKind) {
    for (
      const id of
        byKind
    ) {
      ids.add(id);
    }
  }
  const byCategory =
    LISTENER_IDS_BY_CATEGORY.get(
      event.category
    );
  if (byCategory) {
    for (
      const id of
        byCategory
    ) {
      ids.add(id);
    }
  }
  const sourceKind =
    event
      ?.source
      ?.kind;
  if (sourceKind) {
    const bySource =
      LISTENER_IDS_BY_SOURCE_KIND.get(
        sourceKind
      );
    if (bySource) {
      for (
        const id of
          bySource
      ) {
        ids.add(id);
      }
    }
  }
  return ids;
}
/* ============================================================
   STRUCTURAL LISTENER MATCHING
   ============================================================ */
/**
 * @section structural-listener-matching
 *
 * Predicate callbacks are NOT executed here.
 *
 * semantic-event-dispatcher.js owns async predicate execution.
 */
export function getMatchingSemanticEventListeners(
  event,
  {
    includeDisabled = false
  } = {}
) {
  if (!event) {
    throw new TypeError(
      "getMatchingSemanticEventListeners requires SemanticEvent."
    );
  }
  const candidateIds =
    getCandidateListenerIds(
      event
    );
  const listeners = [];
  for (
    const listenerId of
      candidateIds
  ) {
    const listener =
      LISTENERS_BY_ID.get(
        listenerId
      );
    if (!listener) {
      continue;
    }
    if (
      !includeDisabled &&
      !listener.enabled
    ) {
      continue;
    }
    if (
      !doesSemanticEventMatch(
        event,
        listener.match
      )
    ) {
      continue;
    }
    listeners.push(
      listener
    );
  }
  listeners.sort(
    (
      first,
      second
    ) => {
      if (
        first.priority !==
        second.priority
      ) {
        return (
          first.priority -
          second.priority
        );
      }
      return (
        first.registrationOrder -
        second.registrationOrder
      );
    }
  );
  return Object.freeze(
    listeners
  );
}
/* ============================================================
   EVENT KIND LISTENER LOOKUP
   ============================================================ */
/**
 * @section event-kind-listener-lookup
 */
export function getSemanticEventListenersByKind(
  kind
) {
  if (!requiredString(kind)) {
    return Object.freeze([]);
  }
  const ids =
    LISTENER_IDS_BY_KIND.get(
      kind
    );
  if (!ids) {
    return Object.freeze([]);
  }
  const listeners =
    [
      ...ids
    ]
      .map(
        id =>
          LISTENERS_BY_ID.get(
            id
          )
      )
      .filter(Boolean)
      .sort(
        (
          first,
          second
        ) =>
          first.priority ===
          second.priority
            ? first.registrationOrder -
              second.registrationOrder
            : first.priority -
              second.priority
      );
  return Object.freeze(
    listeners
  );
}
/* ============================================================
   EVENT CATEGORY LISTENER LOOKUP
   ============================================================ */
export function getSemanticEventListenersByCategory(
  category
) {
  const ids =
    LISTENER_IDS_BY_CATEGORY.get(
      category
    );
  if (!ids) {
    return Object.freeze([]);
  }
  return Object.freeze(
    [
      ...ids
    ]
      .map(
        id =>
          LISTENERS_BY_ID.get(
            id
          )
      )
      .filter(Boolean)
  );
}
/* ============================================================
   LISTENER SOURCE LOOKUP
   ============================================================ */
export function getSemanticEventListenersBySource({
  sourceKind = null,
  sourceId = null
} = {}) {
  const listeners = [];
  for (
    const listener of
      LISTENERS_BY_ID.values()
  ) {
    if (
      sourceKind != null &&
      listener.sourceKind !==
        sourceKind
    ) {
      continue;
    }
    if (
      sourceId != null &&
      listener.sourceId !==
        sourceId
    ) {
      continue;
    }
    listeners.push(
      listener
    );
  }
  listeners.sort(
    (
      first,
      second
    ) =>
      first.priority ===
      second.priority
        ? first.registrationOrder -
          second.registrationOrder
        : first.priority -
          second.priority
  );
  return Object.freeze(
    listeners
  );
}
/* ============================================================
   ONE-SHOT SUPPORT
   ============================================================ */
/**
 * @section one-shot-support
 *
 * Dispatcher calls this after a matching once-only listener has executed.
 */
export function consumeSemanticEventListener(
  listenerId
) {
  const listener =
    getSemanticEventListener(
      listenerId
    );
  if (!listener) {
    return false;
  }
  if (!listener.once) {
    return false;
  }
  return unregisterSemanticEventListener(
    listenerId
  );
}
/* ============================================================
   REGISTRY SNAPSHOT
   ============================================================ */
/**
 * @section registry-snapshot
 *
 * Diagnostic/read-only representation.
 *
 * Handlers are intentionally omitted.
 */
export function getSemanticEventRegistrySnapshot() {
  const listeners =
    [
      ...LISTENERS_BY_ID.values()
    ]
      .map(
        listener =>
          Object.freeze({
            id:
              listener.id,
            name:
              listener.name,
            enabled:
              listener.enabled,
            once:
              listener.once,
            priority:
              listener.priority,
            sourceKind:
              listener.sourceKind,
            sourceId:
              listener.sourceId,
            registrationOrder:
              listener.registrationOrder,
            match:
              listener.match,
            metadata:
              listener.metadata
          })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.registrationOrder -
          second.registrationOrder
      );
  return Object.freeze({
    listenerCount:
      listeners.length,
    listeners:
      Object.freeze(
        listeners
      )
  });
}
/* ============================================================
   REGISTRY DIAGNOSTICS
   ============================================================ */
/**
 * @section registry-diagnostics
 */
export function getSemanticEventRegistryDiagnostics() {
  const bySource = {};
  for (
    const listener of
      LISTENERS_BY_ID.values()
  ) {
    const key =
      listener.sourceKind ??
      "unknown";
    bySource[key] =
      (
        bySource[key] ??
        0
      ) +
      1;
  }
  return Object.freeze({
    id:
      SEMANTIC_EVENT_REGISTRY_MODULE_ID,
    version:
      SEMANTIC_EVENT_REGISTRY_MODULE_VERSION,
    listenerCount:
      LISTENERS_BY_ID.size,
    wildcardListenerCount:
      WILDCARD_LISTENER_IDS.size,
    indexedKindCount:
      LISTENER_IDS_BY_KIND.size,
    indexedCategoryCount:
      LISTENER_IDS_BY_CATEGORY.size,
    indexedSourceKindCount:
      LISTENER_IDS_BY_SOURCE_KIND.size,
    listenersBySource:
      Object.freeze(
        bySource
      )
  });
}
/* ============================================================
   COMMON REGISTRATION HELPERS
   ============================================================ */
/**
 * @section common-registration-helpers
 */
export function onSemanticEvent(
  kind,
  handler,
  options = {}
) {
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      kinds: [
        kind
      ]
    }
  });
}
export function onSemanticEventCategory(
  category,
  handler,
  options = {}
) {
  if (
    !Object
      .values(
        SEMANTIC_EVENT_CATEGORY
      )
      .includes(category)
  ) {
    throw new TypeError(
      `Invalid semantic event category: ${String(category)}`
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      categories: [
        category
      ]
    }
  });
}
export function onSemanticEventSourceKind(
  sourceKind,
  handler,
  options = {}
) {
  if (
    !Object
      .values(
        SEMANTIC_EVENT_SOURCE_KIND
      )
      .includes(sourceKind)
  ) {
    throw new TypeError(
      `Invalid semantic event source kind: ${String(sourceKind)}`
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      sourceKinds: [
        sourceKind
      ]
    }
  });
}
/* ============================================================
   ACTOR-SCOPED REGISTRATION
   ============================================================ */
/**
 * @section actor-scoped-registration
 */
export function onActorSemanticEvent(
  actorUuid,
  handler,
  options = {}
) {
  if (!requiredString(actorUuid)) {
    throw new TypeError(
      "Actor-scoped semantic listener requires actorUuid."
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      actorUuid
    }
  });
}
/* ============================================================
   FEATURE-SCOPED REGISTRATION
   ============================================================ */
/**
 * @section feature-scoped-registration
 *
 * Intended for actor_owned_feature_registry/.
 */
export function onFeatureSemanticEvent(
  sourceFeatureId,
  handler,
  options = {}
) {
  if (!requiredString(sourceFeatureId)) {
    throw new TypeError(
      "Feature-scoped semantic listener requires sourceFeatureId."
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      sourceFeatureId
    },
    sourceKind:
      options.sourceKind ??
      SEMANTIC_EVENT_LISTENER_SOURCE_KIND.ACTOR_OWNED_FEATURE,
    sourceId:
      options.sourceId ??
      sourceFeatureId
  });
}
/* ============================================================
   EXECUTION-SCOPED REGISTRATION
   ============================================================ */
/**
 * @section execution-scoped-registration
 */
export function onExecutionSemanticEvent(
  executionId,
  handler,
  options = {}
) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Execution-scoped semantic listener requires executionId."
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      executionId
    }
  });
}
export function onExecutionRootSemanticEvent(
  rootExecutionId,
  handler,
  options = {}
) {
  if (!requiredString(rootExecutionId)) {
    throw new TypeError(
      "Execution-root semantic listener requires rootExecutionId."
    );
  }
  return registerSemanticEventListener({
    ...options,
    handler,
    match: {
      ...(
        options.match ??
        {}
      ),
      rootExecutionId
    }
  });
}
/* ============================================================
   PREDICATE NOTES
   ============================================================ */
/**
 * @section predicate-notes
 *
 * Listener match may contain:
 *
 * predicate(event)
 *
 * Registry intentionally does NOT execute predicate.
 *
 * Dispatcher owns async predicate behavior and error handling.
 *
 * Structural filtering here reduces the number of predicate evaluations
 * required during dispatch.
 */
/* ============================================================
   ONCE-ONLY LISTENER NOTES
   ============================================================ */
/**
 * @section once-only-listener-notes
 *
 * once = true means:
 *
 * first matching EXECUTED listener invocation consumes registration.
 *
 * It does NOT mean:
 *
 * first event considered by registry.
 *
 * Dispatcher calls:
 *
 * consumeSemanticEventListener(listener.id)
 *
 * after listener execution.
 */
/* ============================================================
   ACTOR-OWNED FEATURE REGISTRY NOTES
   ============================================================ */
/**
 * @section actor-owned-feature-registry-notes
 *
 * actor_owned_feature_registry may register listeners:
 *
 * sourceKind =
 * ACTOR_OWNED_FEATURE
 *
 * sourceId =
 * actor-owned descriptor ID
 *
 * match:
 *
 * {
 *   kinds: ["attack.hit"],
 *   actorUuid: "...",
 *   predicate: ...
 * }
 *
 * Registry refresh can then safely:
 *
 * clearSemanticEventListeners({
 *   sourceKind: ACTOR_OWNED_FEATURE,
 *   sourceId: descriptorId
 * })
 *
 * before re-registering changed feature triggers.
 */
/* ============================================================
   LIFECYCLE SERVICE NOTES
   ============================================================ */
/**
 * @section lifecycle-service-notes
 *
 * lifecycle_service may register:
 *
 * turn/round/scene handlers
 * expiration handlers
 * resource reset listeners
 *
 * Registry only stores those subscriptions.
 *
 * Lifecycle timing/state remains lifecycle_service-owned.
 */
/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */
/**
 * @section system-bridge-notes
 *
 * system_bridge may supplement existing feature definitions with:
 *
 * event match metadata
 * trigger kinds
 * listener priority
 *
 * It should provide declarative listener configuration to:
 *
 * actor_owned_feature_registry
 * or another owning runtime module.
 *
 * system_bridge should not directly become the global listener registry.
 */
/* ============================================================
   INDEXING NOTES
   ============================================================ */
/**
 * @section indexing-notes
 *
 * Current indexes:
 *
 * event kind
 * event category
 * event source kind
 *
 * Remaining filters:
 *
 * actorUuid
 * source item
 * source feature
 * execution lineage
 * predicate
 *
 * are applied after candidate lookup.
 *
 * This is intentionally simple until profiling demonstrates need for more
 * indexes.
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * semantic-event-contract.js
 * --------------------------
 *
 * Owns:
 *
 * SemanticEvent
 * SemanticEventMatch
 * doesSemanticEventMatch()
 *
 *
 * semantic-event-dispatcher.js
 * ----------------------------
 *
 * Will call:
 *
 * getMatchingSemanticEventListeners(event)
 *
 * then:
 *
 * evaluate async predicates
 * invoke handlers
 * normalize listener results
 * enforce delivery/propagation rules
 * consume once-only listeners
 *
 *
 * semantic-event-hooks.js
 * -----------------------
 *
 * Registers no feature mechanics.
 *
 * It emits execution lifecycle events through dispatcher/bus.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Registers listeners here but retains lifecycle ownership.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * May use listener source ownership for clean feature refresh.
 *
 *
 * system_bridge/
 * --------------
 *
 * May supply trigger metadata used to construct listeners.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * semantic-event-registry.js never executes listener handlers.
 *
 * INVARIANT 2
 * Listener descriptors are immutable.
 *
 * INVARIANT 3
 * Registry state is authoritative only for subscriptions, not mechanics.
 *
 * INVARIANT 4
 * Listener ordering is deterministic:
 *
 * priority
 * → registration order.
 *
 * INVARIANT 5
 * Lower priority number executes earlier.
 *
 * INVARIANT 6
 * Structural matching occurs before async predicates.
 *
 * INVARIANT 7
 * Async predicate execution belongs to dispatcher.
 *
 * INVARIANT 8
 * once-only listeners are removed only after execution, not merely match.
 *
 * INVARIANT 9
 * Listener source ownership allows clean subsystem/feature refresh.
 *
 * INVARIANT 10
 * actor-owned feature listeners do not make this registry responsible for
 * feature mechanics.
 *
 * INVARIANT 11
 * lifecycle listeners do not make this registry responsible for lifecycle.
 *
 * INVARIANT 12
 * system_bridge may supply listener metadata but does not replace this
 * registry.
 *
 * INVARIANT 13
 * Event values are never mutated by registry operations.
 *
 * INVARIANT 14
 * More secondary indexes should be added only when runtime profiling
 * justifies them.
 */