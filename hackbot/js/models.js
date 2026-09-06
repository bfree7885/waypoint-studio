/**
 * Hackbot entity factories and enumerations.
 * Personal local training / authorized-research workbench.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var TARGET_TYPES = [
    "Local Training Lab",
    "CTF",
    "Intentionally Vulnerable Application",
    "Authorized Bug Bounty",
    "Other Explicitly Authorized Environment"
  ];

  var AUTHORIZATION_TYPES = [
    "Self-owned/local",
    "Training platform authorization",
    "CTF authorization",
    "Bug bounty program authorization",
    "Written explicit authorization",
    "Other explicit authorization"
  ];

  var ASSISTANCE_LEVELS = [
    { value: 5, label: "Instructor", summary: "Explains heavily and provides substantial guidance." },
    { value: 4, label: "Guided", summary: "Teaches but asks the learner to do more reasoning." },
    { value: 3, label: "Partner", summary: "Balanced collaboration." },
    { value: 2, label: "Analyst", summary: "User leads; Hackbot primarily analyzes and questions." },
    { value: 1, label: "Independent", summary: "Minimal intervention unless requested." }
  ];

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "hb_" + Date.now().toString(16) + "_" + Math.random().toString(16).slice(2);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function trim(value) {
    return value == null ? "" : String(value).trim();
  }

  function parseAllowedTargets(value) {
    if (Array.isArray(value)) {
      return value.map(trim).filter(Boolean);
    }
    return trim(value)
      .split(/[\n,]+/)
      .map(trim)
      .filter(Boolean);
  }

  function assistanceMeta(level) {
    var n = Number(level);
    if (!n || n < 1 || n > 5) n = 5;
    var found = null;
    ASSISTANCE_LEVELS.forEach(function (item) {
      if (item.value === n) found = item;
    });
    return found || ASSISTANCE_LEVELS[0];
  }

  function assistanceLabel(level) {
    var meta = assistanceMeta(level);
    return meta.value + " — " + meta.label;
  }

  function isScopeComplete(scope) {
    if (!scope) return false;
    var allowed = parseAllowedTargets(scope.allowedTargets);
    return Boolean(
      trim(scope.targetName) &&
        trim(scope.targetType) &&
        TARGET_TYPES.indexOf(trim(scope.targetType)) !== -1 &&
        trim(scope.authorizationType) &&
        AUTHORIZATION_TYPES.indexOf(trim(scope.authorizationType)) !== -1 &&
        allowed.length > 0
    );
  }

  function scopeErrors(scope) {
    var errors = [];
    if (!trim(scope && scope.targetName)) errors.push("Target name is required.");
    if (!trim(scope && scope.targetType) || TARGET_TYPES.indexOf(trim(scope.targetType)) === -1) {
      errors.push("Target type is required.");
    }
    if (
      !trim(scope && scope.authorizationType) ||
      AUTHORIZATION_TYPES.indexOf(trim(scope.authorizationType)) === -1
    ) {
      errors.push("Authorization type is required.");
    }
    if (!parseAllowedTargets(scope && scope.allowedTargets).length) {
      errors.push("Allowed target(s) are required.");
    }
    return errors;
  }

  function workspace(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      name: trim(partial.name),
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now,
      learningMode: partial.learningMode !== false,
      assistanceLevel: partial.assistanceLevel == null ? 5 : Number(partial.assistanceLevel) || 5,
      activeSessionId: partial.activeSessionId || null,
      source: partial.source || "user"
    };
  }

  function targetScope(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      targetName: trim(partial.targetName),
      targetType: trim(partial.targetType),
      authorizationType: trim(partial.authorizationType),
      allowedTargets: parseAllowedTargets(partial.allowedTargets),
      boundaries: trim(partial.boundaries),
      notes: trim(partial.notes),
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now
    };
  }

  function session(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      name: trim(partial.name) || "Session 1",
      startedAt: partial.startedAt || now,
      endedAt: partial.endedAt || null,
      status: partial.status || "active"
    };
  }

  function conversationMessage(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      role: partial.role || "assistant",
      content: partial.content == null ? "" : String(partial.content),
      createdAt: partial.createdAt || now
    };
  }

  function evidenceItem(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      title: trim(partial.title),
      type: trim(partial.type) || "note",
      content: partial.content == null ? "" : String(partial.content),
      source: trim(partial.source),
      createdAt: partial.createdAt || now
    };
  }

  function action(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      description: trim(partial.description),
      command: trim(partial.command),
      rationale: trim(partial.rationale),
      result: trim(partial.result),
      createdAt: partial.createdAt || now
    };
  }

  function hypothesis(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      statement: trim(partial.statement),
      status: trim(partial.status) || "open",
      supportingEvidenceIds: Array.isArray(partial.supportingEvidenceIds)
        ? partial.supportingEvidenceIds.slice()
        : [],
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now
    };
  }

  function finding(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      title: trim(partial.title),
      severity: trim(partial.severity) || "info",
      description: trim(partial.description),
      evidenceIds: Array.isArray(partial.evidenceIds) ? partial.evidenceIds.slice() : [],
      status: trim(partial.status) || "draft",
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now
    };
  }

  function learningNote(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      concept: trim(partial.concept),
      explanation: trim(partial.explanation),
      createdAt: partial.createdAt || now
    };
  }

  function sessionActivity(partial) {
    var now = nowIso();
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      workspaceId: partial.workspaceId || "",
      sessionId: partial.sessionId || "",
      activityType: trim(partial.activityType) || "note",
      entityId: partial.entityId || null,
      summary: trim(partial.summary),
      createdAt: partial.createdAt || now
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (err) {
      return "";
    }
  }

  Hackbot.Models = {
    DB_NAME: "hackbot-v1",
    DB_VERSION: 1,
    META_LAST_WORKSPACE: "lastWorkspaceId",
    TARGET_TYPES: TARGET_TYPES,
    AUTHORIZATION_TYPES: AUTHORIZATION_TYPES,
    ASSISTANCE_LEVELS: ASSISTANCE_LEVELS,
    uuid: uuid,
    nowIso: nowIso,
    trim: trim,
    parseAllowedTargets: parseAllowedTargets,
    assistanceMeta: assistanceMeta,
    assistanceLabel: assistanceLabel,
    isScopeComplete: isScopeComplete,
    scopeErrors: scopeErrors,
    workspace: workspace,
    targetScope: targetScope,
    session: session,
    conversationMessage: conversationMessage,
    evidenceItem: evidenceItem,
    action: action,
    hypothesis: hypothesis,
    finding: finding,
    learningNote: learningNote,
    sessionActivity: sessionActivity,
    escapeHtml: escapeHtml,
    formatTime: formatTime
  };
})(window);
