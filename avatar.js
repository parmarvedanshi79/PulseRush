import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { appState, $, showView } from "./app.js";

export function initAvatar() {
  $("back-to-profile-btn").addEventListener("click", () =>
    showView("profile-view"),
  );
  $("edit-avatar-btn").addEventListener("click", () => showView("avatar-view"));
}

export function populateAvatarGrid() {
  $("avatar-grid").innerHTML = "";
  appState.avatars.forEach((url) => {
    const btn = document.createElement("button");
    btn.className = "avatar-option";
    btn.innerHTML = `<img src="${url}" alt="Avatar">`;
    btn.onclick = () => selectAvatar(url);
    $("avatar-grid").appendChild(btn);
  });
}

async function selectAvatar(url) {
  if (!appState.currentUserId) return;
  await updateDoc(doc(appState.db, "users", appState.currentUserId), {
    avatarUrl: url,
  });
  if (appState.currentUserData) appState.currentUserData.avatarUrl = url;
  $("profile-avatar-img").src = url;
  showView("profile-view");
}
