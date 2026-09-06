/**
 * Hackbot workbench application shell.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  function qs(id) {
    return document.getElementById(id);
  }

  function fillSelect(select, options) {
    if (!select) return;
    options.forEach(function (value) {
      var opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
  }

  function showFatal(message) {
    var root = qs("hb-root");
    var box = qs("hb-error");
    if (root) root.hidden = true;
    if (!box) return;
    box.hidden = false;
    box.innerHTML =
      "<h1>Hackbot could not start</h1><p>" +
      Hackbot.Models.escapeHtml(message) +
      "</p>";
  }

  Hackbot.App = {
    state: {
      view: "workbench",
      workspaces: [],
      workspace: null,
      scope: null,
      session: null,
      messages: [],
      evidence: [],
      hypotheses: [],
      actions: [],
      findings: [],
      notes: [],
      training: {
        progress: null,
        attempts: [],
        lastEvaluation: null,
        hintText: "",
        draft: ""
      },
      navOpen: false,
      assistOpen: false
    },
    _queue: Promise.resolve(),

    emptyTraining: function () {
      return {
        progress: null,
        attempts: [],
        lastEvaluation: null,
        hintText: "",
        draft: ""
      };
    },

    enqueue: function (work) {
      var self = this;
      this._queue = this._queue.then(work, work).catch(function (err) {
        self.flash(err && err.message ? err.message : String(err));
      });
      return this._queue;
    },

    mount: function (root) {
      var self = this;
      this.root = root;
      if (!Hackbot.Provider.get || !Hackbot.MockProvider) {
        showFatal("AI provider failed to load.");
        return;
      }
      Hackbot.Provider.set(new Hackbot.MockProvider());

      return Hackbot.Store.open()
        .then(function () {
          self.bindChrome();
          self.fillNewWorkspaceOptions();
          Hackbot.Views.renderTerminalPlaceholder(qs("hb-terminal"));
          if (root) root.hidden = false;
          return self.boot();
        })
        .catch(function (err) {
          showFatal(err && err.message ? err.message : String(err));
        });
    },

    fillNewWorkspaceOptions: function () {
      var form = qs("hb-new-form");
      if (!form) return;
      fillSelect(form.elements.targetType, Hackbot.Models.TARGET_TYPES);
      fillSelect(form.elements.authorizationType, Hackbot.Models.AUTHORIZATION_TYPES);
    },

    bindChrome: function () {
      var self = this;
      var newBtn = qs("hb-btn-new");
      var demoBtn = qs("hb-btn-demo");
      var menu = qs("hb-menu");
      var learning = qs("hb-learning");
      var assist = qs("hb-assist");
      var dialog = qs("hb-new-dialog");
      var form = qs("hb-new-form");
      var overlay = document.createElement("div");
      overlay.className = "hb-overlay";
      overlay.hidden = true;
      overlay.id = "hb-overlay";
      document.body.appendChild(overlay);

      if (newBtn) newBtn.addEventListener("click", function () {
        self.openNewWorkspace();
      });
      if (demoBtn) demoBtn.addEventListener("click", function () {
        self.enqueue(function () {
          return self.loadDemo();
        });
      });
      if (menu) {
        menu.addEventListener("click", function () {
          self.state.navOpen = !self.state.navOpen;
          self.syncNav();
        });
      }
      overlay.addEventListener("click", function () {
        self.state.navOpen = false;
        self.syncNav();
      });
      if (learning) {
        learning.addEventListener("change", function () {
          var enabled = learning.checked;
          self.enqueue(function () {
            return self.toggleLearning(enabled);
          });
        });
      }
      if (assist) {
        assist.addEventListener("click", function () {
          self.state.assistOpen = !self.state.assistOpen;
          self.syncAssist();
        });
      }
      ["hb-nav-workbench", "hb-nav-training", "hb-nav-notes", "hb-nav-findings"].forEach(function (id) {
        var btn = qs(id);
        if (!btn) return;
        btn.addEventListener("click", function () {
          var view = btn.getAttribute("data-view") || "workbench";
          self.state.navOpen = false;
          self.syncNav();
          if (view === "training") {
            self.enqueue(function () {
              return self.openTraining();
            });
            return;
          }
          self.state.view = view;
          self.render();
        });
      });
      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          self.enqueue(function () {
            return self.submitNewWorkspace(form);
          });
        });
        ["input", "change"].forEach(function (evt) {
          form.addEventListener(evt, function () {
            self.syncNewWorkspaceGate(form);
          });
        });
        self.syncNewWorkspaceGate(form);
      }
      var cancel = qs("hb-new-cancel");
      if (cancel) {
        cancel.addEventListener("click", function () {
          var dlg = qs("hb-new-dialog");
          if (dlg && dlg.open) dlg.close();
        });
      }
      if (dialog) {
        dialog.addEventListener("close", function () {
          var err = qs("hb-new-error");
          if (err) {
            err.hidden = true;
            err.textContent = "";
          }
        });
      }
    },

    syncNav: function () {
      var app = qs("hb-root");
      var overlay = qs("hb-overlay");
      var menu = qs("hb-menu");
      if (app) app.classList.toggle("is-nav-open", !!this.state.navOpen);
      if (overlay) overlay.hidden = !this.state.navOpen;
      if (menu) menu.setAttribute("aria-expanded", this.state.navOpen ? "true" : "false");
    },

    syncAssist: function () {
      var pop = qs("hb-assist-pop");
      var btn = qs("hb-assist");
      if (pop) pop.hidden = !this.state.assistOpen;
      if (btn) btn.setAttribute("aria-expanded", this.state.assistOpen ? "true" : "false");
    },

    boot: function () {
      var self = this;
      return Hackbot.Store.listWorkspaces().then(function (list) {
        self.state.workspaces = list;
        return Hackbot.Store.getLastWorkspaceId();
      }).then(function (lastId) {
        var match = null;
        self.state.workspaces.forEach(function (ws) {
          if (ws.id === lastId) match = ws;
        });
        if (match) return self.openWorkspace(match.id);
        if (self.state.workspaces[0]) return self.openWorkspace(self.state.workspaces[0].id);
        self.clearWorkspace();
        self.render();
      }).catch(function (err) {
        self.flash(err.message || String(err));
        self.clearWorkspace();
        self.render();
      });
    },

    clearWorkspace: function () {
      this.state.workspace = null;
      this.state.scope = null;
      this.state.session = null;
      this.state.messages = [];
      this.state.evidence = [];
      this.state.hypotheses = [];
      this.state.actions = [];
      this.state.findings = [];
      this.state.notes = [];
      this.state.training = this.emptyTraining();
    },

    openWorkspace: function (id) {
      var self = this;
      return Hackbot.Store.activateWorkspace(id)
        .then(function () {
          return Hackbot.Store.loadWorkbench(id);
        })
        .then(function (bundle) {
          self.state.workspace = bundle.workspace;
          self.state.scope = bundle.scope;
          self.state.session = bundle.session;
          self.state.messages = bundle.messages;
          self.state.evidence = bundle.evidence;
          self.state.hypotheses = bundle.hypotheses;
          self.state.actions = bundle.actions;
          self.state.findings = bundle.findings;
          self.state.notes = bundle.notes;
          self.state.training = self.emptyTraining();
          self.state.view = "workbench";
          return Hackbot.Store.listWorkspaces();
        })
        .then(function (list) {
          self.state.workspaces = list;
          self.render();
        })
        .catch(function (err) {
          self.flash(err.message || String(err));
        });
    },

    refreshLists: function () {
      var self = this;
      return Hackbot.Store.listWorkspaces().then(function (list) {
        self.state.workspaces = list;
      });
    },

    newWorkspacePayload: function (form) {
      return {
        name: form.elements.name.value,
        targetName: form.elements.targetName.value,
        targetType: form.elements.targetType.value,
        authorizationType: form.elements.authorizationType.value,
        allowedTargets: form.elements.allowedTargets.value,
        boundaries: form.elements.boundaries.value,
        notes: form.elements.notes.value
      };
    },

    syncNewWorkspaceGate: function (form) {
      var createBtn = qs("hb-new-create");
      if (!form || !createBtn) return;
      var payload = this.newWorkspacePayload(form);
      var errors = Hackbot.Models.scopeErrors(payload);
      if (!Hackbot.Models.trim(payload.name)) errors.unshift("Workspace name is required.");
      createBtn.disabled = errors.length > 0;
    },

    openNewWorkspace: function () {
      var dialog = qs("hb-new-dialog");
      var form = qs("hb-new-form");
      if (form) form.reset();
      var err = qs("hb-new-error");
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      if (form) this.syncNewWorkspaceGate(form);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    },

    submitNewWorkspace: function (form) {
      var self = this;
      var err = qs("hb-new-error");
      var createBtn = qs("hb-new-create");
      var payload = this.newWorkspacePayload(form);
      var errors = Hackbot.Models.scopeErrors(payload);
      if (!Hackbot.Models.trim(payload.name)) errors.unshift("Workspace name is required.");
      if (errors.length) {
        if (err) {
          err.hidden = false;
          err.textContent = errors[0];
        }
        return;
      }
      if (createBtn) createBtn.disabled = true;
      return Hackbot.Store.createWorkspaceWithScope(payload)
        .then(function (result) {
          var dialog = qs("hb-new-dialog");
          if (dialog && dialog.open) dialog.close();
          return self.openWorkspace(result.workspace.id);
        })
        .catch(function (error) {
          if (err) {
            err.hidden = false;
            err.textContent = error.message || String(error);
          }
        })
        .then(function () {
          if (form) self.syncNewWorkspaceGate(form);
        });
    },

    loadDemo: function () {
      var self = this;
      return Hackbot.Store.loadDemoWorkspace()
        .then(function (result) {
          return self.openWorkspace(result.workspace.id);
        })
        .catch(function (err) {
          self.flash(err.message || String(err));
        });
    },

    currentLesson: function () {
      return Hackbot.Curriculum.getLesson(Hackbot.Curriculum.DEFAULT_LESSON_ID);
    },

    currentStep: function () {
      var lesson = this.currentLesson();
      var progress = this.state.training && this.state.training.progress;
      var idx = progress ? progress.currentStep : 0;
      return Hackbot.Curriculum.getStep(lesson, idx);
    },

    captureTrainingDraft: function () {
      var input = qs("hb-train-input");
      if (input) this.state.training.draft = input.value;
    },

    attemptsForStep: function (exerciseId) {
      return (this.state.training.attempts || []).filter(function (row) {
        return row.exerciseId === exerciseId;
      });
    },

    mergeConcepts: function (step, matchedIds) {
      var progress = this.state.training.progress;
      if (!progress || !step) return;
      var known = progress.conceptsEncountered || [];
      (step.concepts || []).forEach(function (group) {
        if (matchedIds.indexOf(group.id) !== -1 && known.indexOf(group.label) === -1) {
          known.push(group.label);
        }
      });
      progress.conceptsEncountered = known;
    },

    markStepComplete: function (stepId) {
      var progress = this.state.training.progress;
      if (!progress || !stepId) return;
      if (progress.completedSteps.indexOf(stepId) === -1) {
        progress.completedSteps.push(stepId);
      }
    },

    persistProgress: function () {
      if (!this.state.training.progress) return Promise.resolve();
      return Hackbot.Store.saveLessonProgress(this.state.training.progress);
    },

    hydrateCurrentStep: function () {
      var self = this;
      var step = this.currentStep();
      var lesson = this.currentLesson();
      var ws = this.state.workspace;
      this.state.training.hintText = "";
      this.state.training.lastEvaluation = null;
      this.state.training.draft = "";
      if (!step || (step.kind !== "exercise" && step.kind !== "reflection")) {
        return Promise.resolve();
      }
      var rows = this.attemptsForStep(step.id);
      if (!rows.length) return Promise.resolve();
      var last = rows[rows.length - 1];
      this.state.training.draft = last.learnerResponse || "";
      return Promise.resolve(
        Hackbot.Provider.evaluateLearnerResponse({
          lesson: lesson,
          exercise: step,
          learnerResponse: last.learnerResponse,
          assistanceLevel: ws ? ws.assistanceLevel : 5,
          attemptNumber: rows.length
        })
      ).then(function (evaln) {
        self.state.training.lastEvaluation = evaln;
      });
    },

    openTraining: function () {
      var self = this;
      if (!this.state.workspace) {
        this.state.view = "training";
        this.state.training = this.emptyTraining();
        this.render();
        return Promise.resolve();
      }
      this.state.view = "training";
      var lessonId = Hackbot.Curriculum.DEFAULT_LESSON_ID;
      return Hackbot.Store.startOrGetLessonProgress(this.state.workspace.id, lessonId)
        .then(function (progress) {
          self.state.training.progress = progress;
          return Hackbot.Store.listExerciseAttempts(self.state.workspace.id, lessonId);
        })
        .then(function (attempts) {
          self.state.training.attempts = attempts || [];
          return self.hydrateCurrentStep();
        })
        .then(function () {
          self.render();
        });
    },

    submitTraining: function (text) {
      var self = this;
      var step = this.currentStep();
      var lesson = this.currentLesson();
      var progress = this.state.training.progress;
      var ws = this.state.workspace;
      if (!step || !lesson || !progress || !ws) return Promise.resolve();
      if (step.kind !== "exercise" && step.kind !== "reflection") {
        return Promise.resolve();
      }
      var trimmed = Hackbot.Models.trim(text);
      this.state.training.draft = trimmed;
      var attemptNumber = this.attemptsForStep(step.id).length + 1;
      progress.attempts += 1;
      return Promise.resolve(
        Hackbot.Provider.evaluateLearnerResponse({
          lesson: lesson,
          exercise: step,
          learnerResponse: trimmed,
          assistanceLevel: ws.assistanceLevel,
          attemptNumber: attemptNumber
        })
      )
        .then(function (evaln) {
          self.state.training.lastEvaluation = evaln;
          self.state.training.hintText = "";
          self.mergeConcepts(step, evaln.matchedConcepts || []);
          if (evaln.verdict === "CORRECT" || evaln.canAdvance) {
            self.markStepComplete(step.id);
          }
          var notePromise = Promise.resolve();
          if (step.kind === "reflection" && evaln.canAdvance && trimmed) {
            var already = (self.state.notes || []).some(function (note) {
              return note.concept === "HTTP researcher attention";
            });
            if (!already) {
              notePromise = Hackbot.Store.addLearningNote({
                workspaceId: ws.id,
                sessionId: self.state.session ? self.state.session.id : "",
                concept: "HTTP researcher attention",
                explanation: trimmed
              }).then(function () {
                return Hackbot.Store.listNotes(ws.id);
              }).then(function (notes) {
                self.state.notes = notes;
              });
            }
          }
          return notePromise.then(function () {
            return Hackbot.Store.addExerciseAttempt({
              workspaceId: ws.id,
              lessonId: lesson.id,
              exerciseId: step.id,
              learnerResponse: trimmed,
              evaluation: evaln.verdict,
              hintLevel: evaln.hintLevel
            });
          });
        })
        .then(function (row) {
          self.state.training.attempts = self.state.training.attempts.concat([row]);
          return self.persistProgress();
        })
        .then(function () {
          self.render();
        });
    },

    hintTraining: function () {
      var self = this;
      var step = this.currentStep();
      var progress = this.state.training.progress;
      if (!step || !progress) return Promise.resolve();
      this.captureTrainingDraft();
      progress.hintsUsed += 1;
      var hints = step.hints || [];
      var shown = hints.indexOf(this.state.training.hintText);
      var idx = shown < 0 ? 0 : Math.min(shown + 1, Math.max(hints.length - 1, 0));
      this.state.training.hintText = hints[idx] || "";
      return this.persistProgress().then(function () {
        self.render();
      });
    },

    backTraining: function () {
      var self = this;
      var progress = this.state.training.progress;
      if (!progress || progress.currentStep <= 0) return Promise.resolve();
      this.captureTrainingDraft();
      progress.currentStep -= 1;
      return this.persistProgress()
        .then(function () {
          return self.hydrateCurrentStep();
        })
        .then(function () {
          self.render();
        });
    },

    nextTraining: function () {
      var self = this;
      var lesson = this.currentLesson();
      var progress = this.state.training.progress;
      var step = this.currentStep();
      if (!lesson || !progress || !step) return Promise.resolve();
      this.captureTrainingDraft();
      if (step.kind === "read") {
        this.markStepComplete(step.id);
      }
      if (progress.currentStep >= lesson.steps.length - 1) {
        if (progress.completedSteps.length >= lesson.steps.length) {
          progress.status = "completed";
          progress.completedAt = progress.completedAt || Hackbot.Models.nowIso();
        }
        return this.persistProgress().then(function () {
          self.render();
        });
      }
      progress.currentStep += 1;
      return this.persistProgress()
        .then(function () {
          return self.hydrateCurrentStep();
        })
        .then(function () {
          self.render();
        });
    },

    toggleLearning: function (enabled) {
      var self = this;
      var ws = this.state.workspace;
      if (!ws) return Promise.resolve();
      return Hackbot.Store.setLearningMode(ws.id, enabled)
        .then(function (updated) {
          self.state.workspace = updated;
          return self.refreshLists();
        })
        .then(function () {
          self.render();
        })
        .catch(function (err) {
          self.flash(err.message || String(err));
        });
    },

    sendMessage: function (text) {
      var self = this;
      var ws = this.state.workspace;
      var session = this.state.session;
      var content = Hackbot.Models.trim(text);
      if (!ws || !session || !content) return Promise.resolve();
      var user = {
        workspaceId: ws.id,
        sessionId: session.id,
        role: "user",
        content: content
      };
      return Hackbot.Store.addMessage(user)
        .then(function (saved) {
          self.state.messages = self.state.messages.concat([saved]);
          self.render();
          return Hackbot.Provider.chat({
            learningMode: ws.learningMode,
            assistanceLevel: ws.assistanceLevel,
            scope: self.state.scope,
            messages: self.state.messages
          });
        })
        .then(function (reply) {
          return Hackbot.Store.addMessage({
            workspaceId: ws.id,
            sessionId: session.id,
            role: "assistant",
            content: reply && reply.content ? reply.content : "No response."
          });
        })
        .then(function (saved) {
          self.state.messages = self.state.messages.concat([saved]);
          self.render();
        })
        .catch(function (err) {
          self.flash(err.message || String(err));
        });
    },

    flash: function (message) {
      var center = qs("hb-center");
      if (!center || !message) return;
      var note = document.createElement("p");
      note.className = "hb-form-error";
      note.setAttribute("role", "alert");
      note.textContent = message;
      center.prepend(note);
    },

    renderHeader: function () {
      var ws = this.state.workspace;
      var scope = this.state.scope;
      var title = qs("hb-workspace-title");
      var auth = qs("hb-auth-status");
      var learning = qs("hb-learning");
      var assist = qs("hb-assist");
      var assistLabel = qs("hb-assist-label");
      if (title) title.textContent = ws ? ws.name : "No workspace selected";
      if (auth) {
        if (scope && Hackbot.Models.isScopeComplete(scope)) {
          auth.textContent = "Authorization: " + scope.authorizationType + " · " + scope.targetName;
          auth.classList.add("is-ok");
        } else {
          auth.textContent = "Authorization: none — Target Scope required";
          auth.classList.remove("is-ok");
        }
      }
      if (learning) {
        learning.disabled = !ws;
        learning.checked = !!(ws && ws.learningMode);
      }
      if (assist) assist.disabled = !ws;
      if (assistLabel) {
        assistLabel.textContent = ws
          ? Hackbot.Models.assistanceLabel(ws.assistanceLevel)
          : "5 — Instructor";
      }
      this.syncAssist();
    },

    renderNavCurrent: function () {
      var view = this.state.view;
      ["workbench", "training", "notes", "findings"].forEach(function (name) {
        var btn = qs("hb-nav-" + name);
        if (btn) btn.classList.toggle("is-current", view === name);
      });
    },

    renderCenter: function () {
      var el = qs("hb-center");
      var self = this;
      if (!el) return;
      if (!this.state.workspace) {
        el.innerHTML =
          '<div class="hb-empty-home">' +
          "<h2>Start a workspace</h2>" +
          '<p class="hb-loop">Observe → Understand → Hypothesize → Test → Record → Learn</p>' +
          "<p>Create a workspace with Target Scope, or load the local OWASP Training Lab demo. Hackbot stays in this browser.</p>" +
          "</div>";
        return;
      }
      if (this.state.view === "training") {
        Hackbot.Views.renderTraining(el, this.state, {
          onSubmit: function (text) {
            self.enqueue(function () {
              return self.submitTraining(text);
            });
          },
          onHint: function () {
            self.enqueue(function () {
              return self.hintTraining();
            });
          },
          onBack: function () {
            self.enqueue(function () {
              return self.backTraining();
            });
          },
          onNext: function () {
            self.enqueue(function () {
              return self.nextTraining();
            });
          },
          onDraft: function (text) {
            self.state.training.draft = text;
          }
        });
        return;
      }
      if (this.state.view === "notes") {
        Hackbot.Views.renderNotesPage(el, this.state.notes);
        return;
      }
      if (this.state.view === "findings") {
        Hackbot.Views.renderFindingsPage(el, this.state.findings);
        return;
      }
      Hackbot.Views.renderConversation(el, this.state, {
        onSend: function (text) {
          self.enqueue(function () {
            return self.sendMessage(text);
          });
        }
      });
    },

    render: function () {
      var self = this;
      Hackbot.Views.renderWorkspaceList(
        qs("hb-workspace-list"),
        this.state.workspaces,
        this.state.workspace && this.state.workspace.id,
        function (id) {
          self.enqueue(function () {
            return self.openWorkspace(id);
          });
        }
      );
      this.renderHeader();
      this.renderNavCurrent();
      this.renderCenter();
      this.renderRails();
    },

    renderRails: function () {
      var workbenchRail = qs("hb-rail-workbench");
      var trainingRail = qs("hb-rail-training");
      var onTraining = this.state.view === "training";
      if (workbenchRail) workbenchRail.hidden = onTraining;
      if (trainingRail) trainingRail.hidden = !onTraining;
      if (onTraining) {
        Hackbot.Views.renderLearningProgress(trainingRail, this.state);
        return;
      }
      Hackbot.Views.renderScopePanel(qs("hb-panel-scope"), this.state.scope);
      Hackbot.Views.renderHypothesesPanel(qs("hb-panel-hypotheses"), this.state.hypotheses);
      Hackbot.Views.renderEvidencePanel(qs("hb-panel-evidence"), this.state.evidence);
      Hackbot.Views.renderActionsRail(qs("hb-panel-actions"), this.state.actions);
      Hackbot.Views.renderNotesRail(qs("hb-panel-notes"), this.state.notes);
    }
  };
})(window);
