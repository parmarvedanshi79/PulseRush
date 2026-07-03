import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
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

  // Dashboard Tab Toggles
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

  // Dynamic Event Delegations for Historical Reporting Modules
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

  // Fetch fresh user metadata if missing from state cache
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

  // Student Dashboard Metrics Layout Placement
  const ranks = userData.ranks || { first: 0, second: 0, third: 0 };
  $("rank-first-count").textContent = ranks.first || 0;
  $("rank-second-count").textContent = ranks.second || 0;
  $("rank-third-count").textContent = ranks.third || 0;

  // Student Dashboard: Joined Games/History Feed Rendering
  const joinedGames = userData.joinedGames || [];
  const joinedGamesListDiv = $("joined-games-list");
  joinedGamesListDiv.innerHTML =
    '<h4 style="margin-bottom:0.5rem;">My Joined Quizzes (Student)</h4>';
  if (joinedGames.length === 0) {
    joinedGamesListDiv.innerHTML +=
      '<p style="font-size:0.9rem; color:#888;">No games joined yet.</p>';
  } else {
    joinedGames.forEach((game) => {
      const item = document.createElement("button");
      item.className = "btn joined-quiz-item";
      item.dataset.pin = game.pin;
      item.style.margin = "0.25rem 0";
      item.innerHTML = `<span>📖 ${game.name || "Quiz"} (PIN: ${game.pin})</span>`;
      joinedGamesListDiv.appendChild(item);
    });
  }

  // Teacher Dashboard: Active Room Count & Complete Historical Ledger Summaries
  const createdGames = userData.createdGames || [];
  $("games-created-count").textContent = createdGames.length;

  const gamesListDiv = $("created-games-list");
  gamesListDiv.innerHTML =
    '<h4 style="margin-bottom:0.5rem;">Managed Classrooms & History (Teacher)</h4>';

  if (createdGames.length === 0) {
    gamesListDiv.innerHTML +=
      '<p style="font-size:0.9rem; color:#888;">No quizzes created yet.</p>';
    return;
  }

  // Render Basic Quiz Structure Blocks First
  createdGames.forEach((game) => {
    const item = document.createElement("div");
    item.className = "created-quiz-item";
    item.id = `created-game-container-${game.pin}`;
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.alignItems = "stretch";
    item.style.gap = "0.5rem";
    item.style.padding = "1rem";
    item.style.marginBottom = "0.75rem";

    item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span style="font-weight:700;">🛠️ ${game.name || `Quiz ${game.pin}`}</span>
                <button class="btn btn-small" data-pin="${game.pin}" style="width:auto; margin-top:0;">Manage/Launch</button>
            </div>
            <div class="history-ledger-card" id="ledger-${game.pin}" style="font-size:0.85rem; padding:0.5rem 0; margin-top:0.25rem; border-top:1px dashed var(--border-color); color:var(--text-color); opacity:0.8;">
                <span style="color:#888;">Fetching history statistics ledger...</span>
            </div>
        `;
    gamesListDiv.appendChild(item);
  });

  // Phase 3 Query: Read Analytics Records Matching the Instructor's Identifier
  try {
    const historyQuery = query(
      collection(appState.db, "quizHistory"),
      where("creatorId", "==", appState.currentUserId),
    );
    const querySnapshot = await getDocs(historyQuery);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const ledgerContainer = $(`ledger-${data.quizPin}`);

      if (ledgerContainer) {
        // Inject real analytical tracking parameters straight into the specific list entry card frame
        ledgerContainer.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; text-align: left;">
                        <div>🥇 <strong>Winner:</strong> ${data.winnerName || "N/A"}</div>
                        <div>📅 <strong>Date:</strong> ${data.date || "--/--/----"}</div>
                        <div>👥 <strong>Players:</strong> ${data.participantCount || 0} joined</div>
                        <div>📊 <strong>Avg Score:</strong> ${data.averageScore || 0} pts</div>
                    </div>
                `;
      }
    });

    // Loop over components that didn't have a matching history record to clear the fetching state placeholder
    createdGames.forEach((game) => {
      const ledgerContainer = $(`ledger-${game.pin}`);
      if (
        ledgerContainer &&
        ledgerContainer.innerHTML.includes(
          "Fetching history statistics ledger...",
        )
      ) {
        ledgerContainer.innerHTML = `<span style="color:#888; font-style:italic;">No structural completion logs recorded yet (Lobby never closed).</span>`;
      }
    });
  } catch (err) {
    console.error(
      "Error reading historical dashboard parameters summary metrics:",
      err,
    );
  }
}
