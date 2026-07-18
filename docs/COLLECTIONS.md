# Collections

**Workspace kind:** `collection` (`rw_*`)  
**UI:** `workspace.html#collections`

---

## Purpose

Organize literacy materials into durable sets (Linux Security, Home Lab, Identity, Education, …).

Members may be:

- Intelligence entity ids (`cy_*`)
- Knowledge ids (when referenced)
- Research ids (notes, investigations, watchlists, queue items, playbook bookmarks)

Collections **reuse shared ids** — they do not duplicate article or advisory bodies.

---

## API

- `ensureCollection(id, title, memberIds)`
- `addToCollection(collectionId, subjectId)`

Used by Explorer and the Operations Workspace.

---

## Export

Export/import of collections is **future-ready** (platform systems `export` / `import`). V1 keeps models portable without shipping a packager yet.
