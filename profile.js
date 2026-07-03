import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { appState, $, showView } from "./app.js";
import { loadHostReport, loadGameReport } from "./quiz.js";

export function initProfile() {
  $("edit-name-btn").addEventListener("click", () => {
    $("name-display-wrapper").style.display = "none";
    $("name-edit-wrapper").style.display = "block";
    $("name-edit-input").value = $("profile-name-display").textContent;
    $("name-edit-input").focus();
  });

  $("save-name-btn").addEventListener("click", async () => {
    const newName = $("name-edit-input").value.trim();
    if (
      newName &&
      newName !== $("profile-name-display").textContent &&
      appState.currentUserId
    ) {
      await updateDoc(doc(appState.db, "users", appState.currentUserId), {
        name: newName,
      });
      if (appState.currentUserData) appState.currentUserData.name = newName;
      $("profile-name-display").textContent = newName;
    }
    $("name-display-wrapper").style.display = "flex";
    $("name-edit-wrapper").style.display = "none";
  });

  $("details-tab-btn").addEventListener("click", (e) => {
    $("details-content").classList.add("active");
    $("about-content").classList.remove("active");
    e.target.classList.add("active");
    $("about-tab-btn").classList.remove("active");
  });
  $("about-tab-btn").addEventListener("click", (e) => {
    $("details-content").classList.remove("active");
    $("about-content").classList.add("active");
    e.target.classList.add("active");
    $("details-tab-btn").classList.remove("active");
  });

  $("created-games-list").addEventListener("click", async (e) => {
    if (e.target.classList.contains("btn-small")) {
      const pin = e.target.dataset.pin;
      if (pin) await loadHostReport(pin);
    }
  });
  $("joined-games-list").addEventListener("click", async (e) => {
    const target = e.target.closest(".joined-quiz-item");
    if (target) {
      const pin = target.dataset.pin;
      if (pin) await loadGameReport(pin, appState.currentUserId);
    }
  });
}

export async function populateProfileData() {
  if (!appState.currentUserId) return;
  if (!appState.currentUserData) {
    const userDocSnap = await getDoc(
      doc(appState.db, "users", appState.currentUserId),
    );
    if (userDocSnap.exists()) {
      appState.currentUserData = userDocSnap.data();
    } else {
      return;
    }
  }
  const userData = appState.currentUserData;
  $("profile-name-display").textContent = userData.name || "Anonymous";
  $("profile-username-display").textContent = `@${userData.username || "user"}`;
  $("profile-email-display").textContent = userData.email || "No email";
  $("profile-avatar-img").src = userData.avatarUrl || appState.avatars[0];

  const ranks = userData.ranks || { first: 0, second: 0, third: 0 };
  $("rank-first-count").textContent = ranks.first || 0;
  $("rank-second-count").textContent = ranks.second || 0;
  $("rank-third-count").textContent = ranks.third || 0;

  const games = userData.createdGames || [];
  $("games-created-count").textContent = games.length;

  const gamesListDiv = $("created-games-list");
  gamesListDiv.innerHTML = "<h4>My Quizzes</h4>";
  if (games.length === 0) {
    gamesListDiv.innerHTML += "<p>No quizzes created yet.</p>";
  } else {
    games.forEach((game) => {
      const item = document.createElement("div");
      item.className = "created-quiz-item";
      item.innerHTML = `<span>${game.name || `Quiz ${game.pin}`}</span><button class="btn btn-small" data-pin="${game.pin}">Manage</button>`;
      gamesListDiv.appendChild(item);
    });
  }

  const joinedGames = userData.joinedGames || [];
  const joinedGamesListDiv = $("joined-games-list");
  joinedGamesListDiv.innerHTML = "<h4>History</h4>";
  if (joinedGames.length === 0) {
    joinedGamesListDiv.innerHTML += "<p>No games joined yet.</p>";
  } else {
    joinedGames.forEach((game) => {
      const item = document.createElement("button");
      item.className = "btn joined-quiz-item";
      item.dataset.pin = game.pin;
      item.innerHTML = `<span>${game.name || "Quiz"} (PIN: ${game.pin})</span>`;
      joinedGamesListDiv.appendChild(item);
    });
  }
}
