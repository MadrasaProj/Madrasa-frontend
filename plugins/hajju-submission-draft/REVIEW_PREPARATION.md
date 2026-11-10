# Hajju public submission preparation

This folder is a draft for the OpenAI Platform upload. The publisher asked to upload it as a draft with incomplete review details. It is not ready to submit for review. Keep this copy separate from the private Hajju plugin.

**Upload status (9 November 2026):** Not uploaded. OpenAI Platform blocks the upload control until the Personal organization completes individual developer identity verification. The publisher will complete that step later. The prepared draft ZIP is `../hajju-public-draft-0.1.3.zip`.

## Confirmed package details

- Publisher name: Fayis Mahmood (publisher says this is the intended verified identity; dashboard verification remains to check).
- Region: India (`IN`).
- Commerce: Hajju does not sell products or process payments.
- MCP URL: `https://devapi.smartmadrasa.app/mcp`.
- OAuth client mode: ChatGPT client metadata document (`cimd`). The backend reserves dynamic client registration for Gemini redirect URIs.
- Four attendance tools are defined in backend source. Each has boolean `readOnlyHint`, `openWorldHint`, and `destructiveHint` annotations consistent with its behavior.
- Icon: supplied square PNG, 1254 × 1254, 1,974,002 bytes.
- Five positive and three negative review cases are drafted in `hajju/plugin.json`. All cases are **Not run** because there is no reviewer test account connected here.

## Items to complete before upload

1. Publish and verify an HTTPS Hajju product page, support page, privacy policy, and terms of service. The publisher will provide these later. The Smart Madrasa homepage is public, but its footer currently points Privacy policy, Terms, and Contact to the Features page. Add the four verified URLs to `hajju/plugin.json` under `extensions.com.openai.interface`.
2. Fix the deployed backend's `BACKEND_URL` so its protected resource and authorization server metadata advertise `https://devapi.smartmadrasa.app`, not `http://localhost:3005`. Verify `MCP_OAUTH_PORTAL_URL` points to the public teacher sign-in portal. Recheck both `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server` after deployment. This is a deployment setting, not a plugin ZIP change.
3. Create a dedicated reviewer teacher account in a test madrasa, with one assigned active class, at least two active demo students including **Amina Demo**, an unmarked attendance entry for Amina today, and absence/history records within the previous 30 days. Keep credentials out of this package. Provide the exact login URL, tenant, and sign-in instructions in the Platform's secure reviewer access fields.
4. Run each review case using that account and record Passed, Failed, or Blocked with observed tool calls and results. The drafted cases are not evidence of passing tests.
5. Record a real walkthrough, host it at a reviewer-accessible HTTPS URL, verify playback without a private login, and add that URL as `extensions.com.openai.review.demo_recording_url`.
6. In OpenAI Platform, select the verified publisher identity, connect the MCP server, complete required scans and legal attestations, and inspect the imported listing and review fields before submitting for review. Uploading a ZIP is a separate later action.

## Demo walkthrough to record

Use the dedicated test teacher account and keep passwords, tokens, and unrelated student data off screen. Show Hajju in ChatGPT or Codex with the same package version you plan to upload. Allow enough time to read each prompt and result.

1. Ask “What classes am I assigned to?” and show the returned demo class.
2. Ask for today's attendance, including unmarked students, and show the roster.
3. Ask for absences during the last seven days and show the report dates and names.
4. Ask for Amina Demo's attendance history over the last 30 days.
5. Ask to mark Amina Demo absent today. Show Hajju's exact proposed change, approve it, and show the saved result. Use test data so no real parent is notified.
6. Ask Hajju to change Amina Demo's exam mark. Show that it explains the limit without calling an attendance tool.

The recording is incomplete until the actual video is played back, checked for readable results and exposed secrets, hosted, and its URL verified.
