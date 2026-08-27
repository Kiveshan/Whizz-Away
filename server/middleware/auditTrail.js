/**
 * Automatic audit trail.
 *
 * Mounted once, ahead of every route (see routes/index.js), this middleware
 * records one audit_log row for every state-changing request and for the
 * sensitive reads listed in config/auditActions.js — successes, validation
 * failures, permission denials and server errors alike.
 *
 * It is deliberately generic: controllers do not need to be touched for their
 * routes to be audited. Hand-written auditFromReq() calls still exist where a
 * richer, business-level description is worth having; when a handler writes one
 * of those, this middleware stands down for that request (see req.auditLogged)
 * so the trail holds one row per action rather than two.
 */

import { resolveAuditRoute } from "../config/auditActions.js";
import { logAudit, clientIp } from "../utils/auditLogger.js";

// Anything whose key looks like a secret never reaches the database.
const REDACTED_KEY = /pass(word)?|token|secret|jwt|authorization|apikey|api_key|otp|cvv|card_?num|pin\b|account_num|name_of_acc|\bbank\b|\bbranch\b|swift_code|base_salary/i;
const REDACTED = "[REDACTED]";

const MAX_STRING = 200; // long strings are almost always base64/file blobs
const MAX_ARRAY = 20;
const MAX_DEPTH = 4;
const MAX_METADATA_CHARS = 8000;

/**
 * Deep-copy a request payload with secrets removed and large values clipped,
 * so a stored payload can never become an exfiltration vector or a bloat
 * problem.
 */
const sanitise = (value, depth = 0) => {
  if (value === null || value === undefined) return null;
  if (depth > MAX_DEPTH) return "[TRUNCATED]";

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => sanitise(item, depth + 1));
    if (value.length > MAX_ARRAY) items.push(`[+${value.length - MAX_ARRAY} more]`);
    return items;
  }

  if (typeof value === "object") {
    if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACTED_KEY.test(key) ? REDACTED : sanitise(val, depth + 1);
    }
    return out;
  }

  if (typeof value === "string" && value.length > MAX_STRING) {
    return `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING} chars]`;
  }

  return value;
};

const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;

// Multer puts uploads on req.file/req.files; record what was uploaded, never
// the bytes.
const describeFiles = (req) => {
  const files = req.files || (req.file ? [req.file] : []);
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  if (!list.length) return null;
  return list.slice(0, MAX_ARRAY).map((f) => ({
    field: f.fieldname,
    name: f.originalname,
    size: f.size,
    type: f.mimetype,
  }));
};

const buildMetadata = (req, params) => {
  const metadata = {};
  if (!isEmpty(params)) metadata.params = params;
  if (!isEmpty(req.query)) metadata.query = sanitise(req.query);
  if (!isEmpty(req.body)) metadata.body = sanitise(req.body);
  const files = describeFiles(req);
  if (files) metadata.files = files;

  if (isEmpty(metadata)) return null;

  const json = JSON.stringify(metadata);
  if (json.length > MAX_METADATA_CHARS) {
    return { truncated: true, size: json.length, preview: json.slice(0, MAX_METADATA_CHARS) };
  }
  return metadata;
};

const outcomeFor = (status) => {
  if (status < 400) return "SUCCESS";
  if (status === 401 || status === 403) return "DENIED";
  return "FAILURE";
};

const actorLabel = (user) => {
  if (!user) return "Unauthenticated request";
  const name = [user.name, user.surname].filter(Boolean).join(" ");
  return name ? `${name} (user ${user.userid})` : `User ${user.userid}`;
};

export const auditTrail = () => (req, res, next) => {
  const startedAt = Date.now();
  const descriptor = resolveAuditRoute(req.method, req.path);

  if (!descriptor || (descriptor.sensitive === false && req.method === "GET")) {
    return next();
  }

  res.on("finish", () => {
    // A controller already wrote a richer, business-level entry for this
    // request — don't duplicate it. auditLogged covers the success path only,
    // because a handler that errored after (or instead of) its audit call never
    // recorded the failure; auditHandled means the controller audits every
    // outcome itself (login, for instance).
    const outcome = outcomeFor(res.statusCode);
    if (req.auditHandled) return;
    if (req.auditLogged && outcome === "SUCCESS") return;

    const user = req.user || req.session?.user || null;
    const scheduledJob = req.isScheduledJob === true;

    logAudit({
      actionType: descriptor.action,
      entityType: descriptor.entity,
      actorId: user?.userid ?? null,
      actorName: scheduledJob ? "Scheduled job" : actorLabel(user),
      actorRole: user?.roleid ?? null,
      targetId: descriptor.target,
      targetName: descriptor.target ? `${descriptor.entity} ${descriptor.target}` : null,
      details:
        `${scheduledJob ? "Scheduled job" : actorLabel(user)} — ${descriptor.action} ` +
        `(${req.method} ${req.originalUrl.split("?")[0]}) → ${res.statusCode} ${outcome}` +
        (descriptor.mapped ? "" : " [route not in audit registry]"),
      metadata: buildMetadata(req, descriptor.params),
      httpMethod: req.method,
      requestPath: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      outcome,
      durationMs: Date.now() - startedAt,
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || null,
    });
  });

  return next();
};

export default auditTrail;
