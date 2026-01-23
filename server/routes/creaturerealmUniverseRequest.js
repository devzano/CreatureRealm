// server/routes/creaturerealmUniverseRequest.js
import { Router } from "express";
import { Resend } from "resend";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const APP_ICON_URL =
  "https://github.com/devzano/CreatureRealm/blob/main/client/assets/images/icon.png?raw=true";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function clampInt(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function hypeLabel(ratingFinal) {
  if (ratingFinal >= 5) return "PLEASE";
  if (ratingFinal === 4) return "Need it";
  if (ratingFinal === 3) return "Want it";
  if (ratingFinal === 2) return "Interested";
  return "Curious";
}

router.post("/universe-request", async (req, res) => {
  const { rating, name, email, universe, message } = req.body ?? {};

  const ratingNum = Number(rating);
  const ratingFinal = Number.isFinite(ratingNum) ? clampInt(Math.round(ratingNum), 1, 5) : NaN;

  const nameStr = String(name ?? "").trim();
  const emailStr = String(email ?? "").trim();
  const universeStr = String(universe ?? "").trim();
  const messageStr = String(message ?? "").trim();

  if (!Number.isFinite(ratingFinal) || ratingFinal < 1 || ratingFinal > 5) {
    return res.status(400).json({ error: "Rating must be a number from 1 to 5." });
  }
  if (!nameStr) return res.status(400).json({ error: "Name is required." });
  if (!emailStr) return res.status(400).json({ error: "Email is required." });
  if (!universeStr) return res.status(400).json({ error: "Universe (game name) is required." });
  if (!messageStr) return res.status(400).json({ error: "Message is required." });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailStr)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  const from = process.env.RESEND_FROM;
  const to = process.env.CREATURE_REALM_TO || process.env.DEV_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }
  if (!from || !to) {
    return res.status(500).json({
      error: "Email routing is not configured (RESEND_FROM / CREATURE_REALM_TO or DEV_EMAIL).",
    });
  }

  const subject = `CreatureRealm — Universe Request: ${universeStr} (${ratingFinal}/5)`;

  const BG = "#091928";
  const ACCENT = "#0cd3f1";

  const safeMessageHtml = esc(messageStr).replace(/\n/g, "<br/>");
  const hype = hypeLabel(ratingFinal);

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${esc(subject)}</title>
    </head>
    <body style="margin:0; padding:0; background:${BG}; color:#e5e7eb;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        Universe request: ${esc(universeStr)} • Priority ${esc(ratingFinal)}/5
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG}; padding: 28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px;">
              <tr>
                <td style="padding: 0 0 14px 0;">
                  <div style="display:flex; align-items:center; gap:10px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
                    <img
                      src="${APP_ICON_URL}"
                      width="34"
                      height="34"
                      alt="CreatureRealm"
                      style="
                        display:block;
                        width:34px; height:34px;
                        border-radius: 12px;
                        border: 1px solid rgba(12,211,241,0.25);
                        background: rgba(12,211,241,0.10);
                      "
                    />
                    <div style="font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; font-size: 11px; color: rgba(229,231,235,0.78);">
                      CreatureRealm
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="
                  background: rgba(255,255,255,0.04);
                  border: 1px solid rgba(12,211,241,0.18);
                  border-radius: 18px;
                  overflow: hidden;
                  box-shadow: 0 16px 40px rgba(0,0,0,0.35);
                ">
                  <!-- Top accent bar -->
                  <div style="height: 6px; background: linear-gradient(90deg, ${ACCENT}, rgba(12,211,241,0.15));"></div>

                  <div style="padding: 18px 18px 14px 18px;">
                    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <!-- left icon -->
                        <img
                          src="${APP_ICON_URL}"
                          width="38"
                          height="38"
                          alt="CreatureRealm"
                          style="
                            display:block;
                            width:38px; height:38px;
                            border-radius: 14px;
                            border: 1px solid rgba(12,211,241,0.22);
                            background: rgba(12,211,241,0.10);
                          "
                        />

                        <div style="flex:1;">
                          <div style="font-size: 18px; font-weight: 900; color:#f9fafb; line-height:1.2;">
                            Universe Request
                          </div>
                          <div style="margin-top:4px; font-size: 12px; color: rgba(229,231,235,0.72);">
                            A user requested a new game universe for CreatureRealm.
                          </div>
                        </div>

                        <div style="
                          font-size: 12px;
                          color: ${ACCENT};
                          background: rgba(12,211,241,0.10);
                          border: 1px solid rgba(12,211,241,0.18);
                          padding: 6px 10px;
                          border-radius: 999px;
                          font-weight: 800;
                          white-space: nowrap;
                        ">
                          ${esc(String(ratingFinal))}/5 • ${esc(hype)}
                        </div>
                      </div>

                      <!-- Details -->
                      <div style="margin-top: 14px; padding: 14px; border-radius: 14px; border: 1px solid rgba(148,163,184,0.18); background: rgba(255,255,255,0.03);">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
                          <tr>
                            <td style="padding: 6px 0; color: rgba(229,231,235,0.65); width: 120px;">Universe</td>
                            <td style="padding: 6px 0; color:#f9fafb; font-weight:800;">${esc(universeStr)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: rgba(229,231,235,0.65);">Name</td>
                            <td style="padding: 6px 0; color:#f9fafb;">${esc(nameStr)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: rgba(229,231,235,0.65);">Email</td>
                            <td style="padding: 6px 0;">
                              <a href="mailto:${esc(emailStr)}" style="color:${ACCENT}; text-decoration:none; font-weight:800;">
                                ${esc(emailStr)}
                              </a>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Message -->
                      <div style="margin-top: 12px;">
                        <div style="font-size: 12px; color: rgba(229,231,235,0.70); font-weight: 800; letter-spacing: 0.02em; margin: 0 0 8px 2px;">
                          What should tracking include?
                        </div>
                        <div style="
                          border-radius: 14px;
                          border: 1px solid rgba(148,163,184,0.18);
                          background: rgba(0,0,0,0.18);
                          padding: 14px;
                          font-size: 13px;
                          line-height: 1.55;
                          color: rgba(243,244,246,0.92);
                          white-space: normal;
                        ">
                          ${safeMessageHtml}
                        </div>
                      </div>

                      <!-- Footer -->
                      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(148,163,184,0.18); font-size: 11px; color: rgba(148,163,184,0.85);">
                        Tip: hit <strong style="color:#e5e7eb;">Reply</strong> to respond directly to the user.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding: 14px 2px 0 2px; text-align:center; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; color: rgba(148,163,184,0.85);">
                  <span style="color:${ACCENT}; font-weight:800;">CreatureRealm</span> • Universe Requests
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const text =
    `CreatureRealm Universe Request\n\n` +
    `Universe: ${universeStr}\n` +
    `Priority: ${ratingFinal}/5 (${hype})\n` +
    `Name: ${nameStr}\n` +
    `Email: ${emailStr}\n\n` +
    `What should tracking include?\n${messageStr}\n`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: emailStr,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[UniverseRequest] Resend Error ❌:", error);
      return res.status(500).json({ error: "Failed to send request email." });
    }

    console.log("[UniverseRequest] Email sent ✅", data?.id || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[UniverseRequest] Resend Exception ❌:", err?.message || err);
    return res.status(500).json({ error: "Failed to send request email." });
  }
});

export default router;
