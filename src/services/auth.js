import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import Portal from "@arcgis/core/portal/Portal.js";

const PORTAL_URL = "https://www.arcgis.com";

const oauthInfo = new OAuthInfo({
  appId: "NeupWdxW2ksdQT59",
  popup: false,
  portalUrl: PORTAL_URL,
});

IdentityManager.registerOAuthInfos([oauthInfo]);

export async function checkSignIn() {
  try {
    await IdentityManager.checkSignInStatus(`${PORTAL_URL}/sharing`);
    return true;
  } catch {
    return false;
  }
}

export async function signIn() {
  await IdentityManager.getCredential(`${PORTAL_URL}/sharing`);
}

export function signOut() {
  IdentityManager.destroyCredentials();
  window.location.reload();
}

export async function getPortalUser() {
  const portal = new Portal({ url: PORTAL_URL });
  await portal.load();
  return portal.user;
}

export async function getToken() {
  const cred = await IdentityManager.getCredential(`${PORTAL_URL}/sharing`);
  return { token: cred.token, username: cred.userId };
}
