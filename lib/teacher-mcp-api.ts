import { ApiError, apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const REQUEST_FIELDS = [
  "response_type", "client_id", "redirect_uri", "scope", "code_challenge",
  "code_challenge_method", "resource", "state",
] as const;
const SCOPES = new Set(["attendance:read", "attendance:write", "marks:read", "marks:write", "homework:read", "homework:write", "leave:read", "leave:write", "fees:read", "fees:write", "offline_access"]);
const GEMINI_HOSTS = new Set([
  "oauth-redirect.googleusercontent.com",
  "oauth-redirect-sandbox.googleusercontent.com",
  "oauth-redirect-test.googleusercontent.com",
]);

export type TeacherOAuthRequest = Record<(typeof REQUEST_FIELDS)[number], string>;

export function parseTeacherOAuthRequest(params: URLSearchParams) {
  const request = Object.fromEntries(REQUEST_FIELDS.map((key) => {
    if (params.getAll(key).length > 1) throw new Error("Duplicate authorization parameter.");
    return [key, params.get(key) ?? ""];
  })) as TeacherOAuthRequest;
  const chatgpt = /^https:\/\/chatgpt\.com\/oauth\/(?:client\.json|([A-Za-z0-9_-]{1,128})\/client\.json)$/.exec(request.client_id);
  const isGemini = /^sm_oauth_[A-Za-z0-9-]+$/.test(request.client_id);
  if (!chatgpt && !isGemini) throw new Error("Unsupported connection. Start again from your chat app.");

  const callback = new URL(request.redirect_uri);
  const expectedChatgptCallback = chatgpt?.[1]
    ? `https://chatgpt.com/connector/oauth/${chatgpt[1]}`
    : "https://chatgpt.com/connector_platform_oauth_redirect";
  if (chatgpt ? request.redirect_uri !== expectedChatgptCallback :
    callback.protocol !== "https:" || !GEMINI_HOSTS.has(callback.hostname) ||
    callback.port || callback.username || callback.password || callback.search || callback.hash ||
    callback.pathname.length > 512 || !/^\/(?:r|a)\/[^/?#]+$/.test(callback.pathname)) {
    throw new Error("Invalid return address. Start again from your chat app.");
  }
  if (request.response_type !== "code" || request.code_challenge_method !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(request.code_challenge) || (chatgpt && !request.resource)) {
    throw new Error("Incomplete authorization request. Start again from your chat app.");
  }
  if (request.state.length > 2048 || /[\r\n]/.test(request.state)) {
    throw new Error("Invalid authorization state. Start again from your chat app.");
  }
  const scopes = (request.scope || "attendance:read attendance:write").split(/\s+/).filter(Boolean);
  if (!scopes.some((scope) => scope.endsWith(":read")) ||
    scopes.some((scope) => !SCOPES.has(scope)) ||
    scopes.some((scope) => scope.endsWith(":write") && !scopes.includes(scope.replace(/:write$/, ":read")))) {
    throw new Error("Unsupported permissions. Start again from your chat app.");
  }
  return { request, clientName: chatgpt ? "ChatGPT" : "Gemini", scopes: [...new Set(scopes)] };
}

export function deniedTeacherOAuthCallback(request: TeacherOAuthRequest) {
  const callback = new URL(request.redirect_uri);
  callback.searchParams.set("error", "access_denied");
  if (request.state) callback.searchParams.set("state", request.state);
  return callback.toString();
}

export async function completeTeacherOAuth(request: TeacherOAuthRequest, token: string, approved: boolean) {
  try {
    const result = await apiFetch<{ redirectUrl: string }>(
      `${API_ORIGIN.replace(/\/$/, "")}/oauth/authorize/complete`, token,
      { method: "POST", body: JSON.stringify({ ...request, approved }) },
    );
    const callback = new URL(result.redirectUrl);
    const expected = new URL(request.redirect_uri);
    if (callback.origin !== expected.origin || callback.pathname !== expected.pathname ||
      callback.username || callback.password || callback.hash) {
      throw new Error("The server returned an invalid return address. Please try connecting again.");
    }
    return callback.toString();
  } catch (error) {
    if (error instanceof ApiError && typeof error.details?.error_description === "string") {
      throw new ApiError(error.details.error_description, error.code, error.details);
    }
    throw error;
  }
}
