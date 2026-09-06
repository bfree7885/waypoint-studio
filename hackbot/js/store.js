/**
 * Hackbot IndexedDB wrapper — local-first, versioned, no cloud sync.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var M = function () {
    return Hackbot.Models;
  };

  var STORE_NAMES = [
    "workspaces",
    "targetScopes",
    "sessions",
    "conversationMessages",
    "evidenceItems",
    "actions",
    "hypotheses",
    "findings",
    "learningNotes",
    "sessionActivities",
    "meta"
  ];

  var dbPromise = null;

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error || new Error("IndexedDB transaction aborted"));
      };
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function openDb() {
    var schema = M();
    if (!global.indexedDB) {
      return Promise.reject(new Error("IndexedDB is not available in this browser."));
    }
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(schema.DB_NAME, schema.DB_VERSION);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        var workspaces = db.objectStoreNames.contains("workspaces")
          ? ev.target.transaction.objectStore("workspaces")
          : db.createObjectStore("workspaces", { keyPath: "id" });
        if (!workspaces.indexNames.contains("by_updated")) {
          workspaces.createIndex("by_updated", "updatedAt", { unique: false });
        }

        var scopes = db.objectStoreNames.contains("targetScopes")
          ? ev.target.transaction.objectStore("targetScopes")
          : db.createObjectStore("targetScopes", { keyPath: "id" });
        if (!scopes.indexNames.contains("by_workspace")) {
          scopes.createIndex("by_workspace", "workspaceId", { unique: false });
        }

        var sessions = db.objectStoreNames.contains("sessions")
          ? ev.target.transaction.objectStore("sessions")
          : db.createObjectStore("sessions", { keyPath: "id" });
        if (!sessions.indexNames.contains("by_workspace")) {
          sessions.createIndex("by_workspace", "workspaceId", { unique: false });
        }

        function workspaceSessionStore(name) {
          var store = db.objectStoreNames.contains(name)
            ? ev.target.transaction.objectStore(name)
            : db.createObjectStore(name, { keyPath: "id" });
          if (!store.indexNames.contains("by_workspace")) {
            store.createIndex("by_workspace", "workspaceId", { unique: false });
          }
          if (!store.indexNames.contains("by_session")) {
            store.createIndex("by_session", "sessionId", { unique: false });
          }
          return store;
        }

        workspaceSessionStore("conversationMessages");
        workspaceSessionStore("evidenceItems");
        workspaceSessionStore("actions");
        workspaceSessionStore("hypotheses");
        workspaceSessionStore("findings");
        workspaceSessionStore("learningNotes");
        workspaceSessionStore("sessionActivities");

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("Could not open Hackbot IndexedDB"));
      };
    });
  }

  function db() {
    if (!dbPromise) dbPromise = openDb();
    return dbPromise;
  }

  function withStores(names, mode, worker) {
    return db().then(function (database) {
      var tx = database.transaction(names, mode);
      var stores = {};
      names.forEach(function (n) {
        stores[n] = tx.objectStore(n);
      });
      var work = Promise.resolve(worker(stores));
      return Promise.all([work, txDone(tx)]).then(function (pair) {
        return pair[0];
      });
    });
  }

  function getAllByIndex(storeName, indexName, value) {
    return withStores([storeName], "readonly", function (stores) {
      return reqToPromise(stores[storeName].index(indexName).getAll(value));
    });
  }

  function getById(storeName, id) {
    if (!id) return Promise.resolve(null);
    return withStores([storeName], "readonly", function (stores) {
      return reqToPromise(stores[storeName].get(id));
    });
  }

  function putRecord(storeName, record) {
    return withStores([storeName], "readwrite", function (stores) {
      stores[storeName].put(record);
      return record;
    });
  }

  function sortByCreated(list) {
    return (list || []).slice().sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }

  function sortWorkspaces(list) {
    return (list || []).slice().sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
  }

  function getMeta(key) {
    return withStores(["meta"], "readonly", function (stores) {
      return reqToPromise(stores.meta.get(key)).then(function (row) {
        return row ? row.value : null;
      });
    });
  }

  function setMeta(key, value) {
    return withStores(["meta"], "readwrite", function (stores) {
      stores.meta.put({ key: key, value: value });
      return value;
    });
  }

  function listWorkspaces() {
    return withStores(["workspaces"], "readonly", function (stores) {
      return reqToPromise(stores.workspaces.getAll());
    }).then(sortWorkspaces);
  }

  function getWorkspace(id) {
    return getById("workspaces", id);
  }

  function getScopeForWorkspace(workspaceId) {
    return getAllByIndex("targetScopes", "by_workspace", workspaceId).then(function (rows) {
      return rows && rows.length ? rows[0] : null;
    });
  }

  function listSessions(workspaceId) {
    return getAllByIndex("sessions", "by_workspace", workspaceId).then(sortByCreated);
  }

  function addActivity(partial) {
    var row = M().sessionActivity(partial);
    return putRecord("sessionActivities", row);
  }

  function createWorkspaceWithScope(input) {
    var Models = M();
    var name = Models.trim(input && input.name);
    if (!name) {
      return Promise.reject(new Error("Workspace name is required."));
    }
    var scopeDraft = Models.targetScope({
      targetName: input.targetName,
      targetType: input.targetType,
      authorizationType: input.authorizationType,
      allowedTargets: input.allowedTargets,
      boundaries: input.boundaries,
      notes: input.notes
    });
    var errors = Models.scopeErrors(scopeDraft);
    if (errors.length) {
      return Promise.reject(new Error(errors[0]));
    }

    var ws = Models.workspace({
      name: name,
      learningMode: true,
      assistanceLevel: 5,
      source: input.source || "user"
    });
    var sess = Models.session({
      workspaceId: ws.id,
      name: "Session 1",
      status: "active"
    });
    ws.activeSessionId = sess.id;
    scopeDraft.workspaceId = ws.id;
    var activity = Models.sessionActivity({
      workspaceId: ws.id,
      sessionId: sess.id,
      activityType: "workspace_created",
      entityId: ws.id,
      summary: "Workspace created with required Target Scope."
    });
    var scopeActivity = Models.sessionActivity({
      workspaceId: ws.id,
      sessionId: sess.id,
      activityType: "scope_recorded",
      entityId: scopeDraft.id,
      summary: "Target Scope recorded: " + scopeDraft.targetName + " (" + scopeDraft.authorizationType + ")."
    });

    return withStores(
      ["workspaces", "targetScopes", "sessions", "sessionActivities", "meta"],
      "readwrite",
      function (stores) {
        stores.workspaces.put(ws);
        stores.targetScopes.put(scopeDraft);
        stores.sessions.put(sess);
        stores.sessionActivities.put(activity);
        stores.sessionActivities.put(scopeActivity);
        stores.meta.put({ key: Models.META_LAST_WORKSPACE, value: ws.id });
        return { workspace: ws, scope: scopeDraft, session: sess };
      }
    );
  }

  function assertActiveScope(workspaceId) {
    var Models = M();
    return getScopeForWorkspace(workspaceId).then(function (scope) {
      if (!Models.isScopeComplete(scope)) {
        throw new Error("A complete Target Scope is required before this workspace can become active.");
      }
      return scope;
    });
  }

  function activateWorkspace(workspaceId) {
    var Models = M();
    return assertActiveScope(workspaceId).then(function (scope) {
      return getWorkspace(workspaceId).then(function (ws) {
        if (!ws) throw new Error("Workspace not found.");
        ws.updatedAt = Models.nowIso();
        return putRecord("workspaces", ws).then(function () {
          return setMeta(Models.META_LAST_WORKSPACE, ws.id).then(function () {
            return { workspace: ws, scope: scope };
          });
        });
      });
    });
  }

  function updateWorkspace(id, patch) {
    var Models = M();
    return getWorkspace(id).then(function (ws) {
      if (!ws) throw new Error("Workspace not found.");
      Object.keys(patch || {}).forEach(function (key) {
        ws[key] = patch[key];
      });
      ws.updatedAt = Models.nowIso();
      return putRecord("workspaces", ws);
    });
  }

  function setLearningMode(workspaceId, enabled) {
    return updateWorkspace(workspaceId, { learningMode: !!enabled });
  }

  function addMessage(partial) {
    var row = M().conversationMessage(partial);
    return putRecord("conversationMessages", row).then(function () {
      return addActivity({
        workspaceId: row.workspaceId,
        sessionId: row.sessionId,
        activityType: "message",
        entityId: row.id,
        summary: (row.role === "user" ? "Learner" : "Hackbot") + " added a conversation note."
      }).then(function () {
        return row;
      });
    });
  }

  function listMessages(workspaceId) {
    return getAllByIndex("conversationMessages", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listEvidence(workspaceId) {
    return getAllByIndex("evidenceItems", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listHypotheses(workspaceId) {
    return getAllByIndex("hypotheses", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listActions(workspaceId) {
    return getAllByIndex("actions", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listFindings(workspaceId) {
    return getAllByIndex("findings", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listNotes(workspaceId) {
    return getAllByIndex("learningNotes", "by_workspace", workspaceId).then(sortByCreated);
  }

  function listActivities(workspaceId) {
    return getAllByIndex("sessionActivities", "by_workspace", workspaceId).then(sortByCreated);
  }

  function findDemoWorkspace() {
    return listWorkspaces().then(function (list) {
      var found = null;
      list.forEach(function (ws) {
        if (!found && ws.source === "demo") found = ws;
      });
      return found;
    });
  }

  function loadDemoWorkspace() {
    return findDemoWorkspace().then(function (existing) {
      if (existing) return activateWorkspace(existing.id).then(function (result) {
        result.created = false;
        return result;
      });
      return createWorkspaceWithScope({
        name: "OWASP Training Lab",
        targetName: "OWASP Training Lab",
        targetType: "Intentionally Vulnerable Application",
        authorizationType: "Self-owned/local",
        allowedTargets: "localhost\nlocal training environment",
        boundaries: "Local machine and explicitly local training apps only. No internet targets.",
        notes: "Synthetic / local training environment for authorized practice.",
        source: "demo"
      }).then(function (result) {
        result.created = true;
        return result;
      });
    });
  }

  function loadWorkbench(workspaceId) {
    var Models = M();
    return assertActiveScope(workspaceId).then(function (scope) {
      return getWorkspace(workspaceId).then(function (ws) {
        if (!ws) throw new Error("Workspace not found.");
        var sessionId = ws.activeSessionId;
        var sessionPromise = sessionId
          ? getById("sessions", sessionId)
          : listSessions(workspaceId).then(function (rows) {
              return rows[0] || null;
            });
        return Promise.all([
          sessionPromise,
          listMessages(workspaceId),
          listEvidence(workspaceId),
          listHypotheses(workspaceId),
          listActions(workspaceId),
          listFindings(workspaceId),
          listNotes(workspaceId),
          listActivities(workspaceId)
        ]).then(function (parts) {
          return {
            workspace: ws,
            scope: scope,
            session: parts[0],
            messages: parts[1],
            evidence: parts[2],
            hypotheses: parts[3],
            actions: parts[4],
            findings: parts[5],
            notes: parts[6],
            activities: parts[7],
            assistance: Models.assistanceMeta(ws.assistanceLevel)
          };
        });
      });
    });
  }

  Hackbot.Store = {
    STORE_NAMES: STORE_NAMES,
    open: function () {
      return db();
    },
    listWorkspaces: listWorkspaces,
    getWorkspace: getWorkspace,
    getScopeForWorkspace: getScopeForWorkspace,
    createWorkspaceWithScope: createWorkspaceWithScope,
    activateWorkspace: activateWorkspace,
    assertActiveScope: assertActiveScope,
    updateWorkspace: updateWorkspace,
    setLearningMode: setLearningMode,
    addMessage: addMessage,
    listMessages: listMessages,
    listEvidence: listEvidence,
    listHypotheses: listHypotheses,
    listActions: listActions,
    listFindings: listFindings,
    listNotes: listNotes,
    listActivities: listActivities,
    loadDemoWorkspace: loadDemoWorkspace,
    findDemoWorkspace: findDemoWorkspace,
    loadWorkbench: loadWorkbench,
    getLastWorkspaceId: function () {
      return getMeta(M().META_LAST_WORKSPACE);
    },
    setLastWorkspaceId: function (id) {
      return setMeta(M().META_LAST_WORKSPACE, id);
    }
  };
})(window);
