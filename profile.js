async function populateProfileData() {
  if (!currentUserId) return;
  if (!currentUserData) {
    const userDocSnap = await getDoc(doc(db, "users", currentUserId));
    if (userDocSnap.exists()) {
      currentUserData = userDocSnap.data();
      if (!currentUserData.ranks) {
        currentUserData.ranks = { first: 0, second: 0, third: 0 };
        await updateDoc(doc(db, "users", currentUserId), {
          ranks: currentUserData.ranks,
        });
      }
    } else {
      console.error("User doc not found in populateProfileData");
      return;
    }
  }
  const userData = currentUserData;
  $("profile-name-display").textContent = userData.name || "Anonymous";
  $("profile-username-display").textContent = `@${userData.username || "user"}`;
  $("profile-email-display").textContent = userData.email || "No email";
  $("profile-avatar-img").src = userData.avatarUrl || avatars[0];

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
      const pin = game.pin;
      const name = game.name || `Quiz ${pin}`;
      const item = document.createElement("div");
      item.className = "created-quiz-item";
      item.innerHTML = `<span>${name}</span><button class="btn btn-small" data-pin="${pin}">Manage</button>`;
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
    if (pin) await loadGameReport(pin, currentUserId);
  }
});
$("back-to-profile-from-report-btn").addEventListener("click", () =>
  showView("profile-view"),
);
$("back-to-profile-from-game-btn").addEventListener("click", () =>
  showView("profile-view"),
);

function populateAvatarGrid() {
  $("avatar-grid").innerHTML = "";
  avatars.forEach((url) => {
    const btn = document.createElement("button");
    btn.className = "avatar-option";
    btn.innerHTML = `<img src="${url}" alt="Avatar">`;
    btn.onclick = () => selectAvatar(url);
    $("avatar-grid").appendChild(btn);
  });
}

async function loadHostReport(pin) {
  try {
    const quizDocRef = doc(db, "quizzes", pin);
    const quizSnap = await getDoc(quizDocRef);
    if (!quizSnap.exists()) {
      alert("Quiz not found!");
      return;
    }
    const quizData = quizSnap.data();

    if (quizData.gameState.status !== "finished") {
      currentGamePin = pin;
      $("lobby-pin-display").textContent = pin;
      listenToGameUpdates(pin, true);
      showView("game-lobby-view");
      return;
    }

    $("host-report-title").textContent = `Report: ${quizData.quizName}`;
    const participantsList = $("host-report-participants");
    participantsList.innerHTML = "<p>Loading participants...</p>";

    const playersColRef = collection(db, "quizzes", pin, "players");
    const playersSnap = await getDocs(playersColRef);

    participantsList.innerHTML = "";

    if (playersSnap.empty) {
      participantsList.innerHTML = "<p>No players joined this game.</p>";
    }

    playersSnap.docs.forEach((playerDoc) => {
      const playerData = playerDoc.data();
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = `${playerData.name} (Score: ${playerData.score})`;
      btn.onclick = () => {
        loadGameReport(pin, playerDoc.id, playerData.name);
      };
      participantsList.appendChild(btn);
    });

    showView("host-report-selection-view");
  } catch (error) {
    console.error("Error loading host report:", error);
    alert("Could not load report: " + error.message);
  }
}

async function loadGameReport(pin, playerId, playerName = "Your") {
  try {
    const quizDocRef = doc(db, "quizzes", pin);
    const playerDocRef = doc(db, "quizzes", pin, "players", playerId);

    const [quizSnap, playerSnap] = await Promise.all([
      getDoc(quizDocRef),
      getDoc(playerDocRef),
    ]);

    if (!quizSnap.exists() || !playerSnap.exists()) {
      alert("Error: Game or player data not found.");
      return;
    }

    const quizData = quizSnap.data();
    const playerData = playerSnap.data();

    $("game-report-title").textContent = `${quizData.quizName}`;
    $("game-report-subtitle").textContent =
      `${playerName}'s Report - Final Score: ${playerData.score}`;

    const reportItemsContainer = $("game-report-items");
    reportItemsContainer.innerHTML = "";

    if (!playerData.answers || playerData.answers.length === 0) {
      reportItemsContainer.innerHTML =
        "<p>No answer data was recorded for this game.</p>";
      showView("game-report-view");
      return;
    }

    playerData.answers.forEach((answer, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "report-item";

      let optionsHTML = "";
      answer.options.forEach((opt, optIndex) => {
        let classNames = "report-option";
        if (optIndex === answer.correctAnswerIndex) {
          classNames += " correct";
        }
        if (optIndex === answer.submittedAnswerIndex) {
          classNames += " submitted";
        }
        optionsHTML += `<span class="${classNames}">${opt.text}</span>`;
      });

      itemEl.innerHTML = `
                        <h4>Q${index + 1}: ${answer.question}</h4>
                        ${optionsHTML}
                    `;
      reportItemsContainer.appendChild(itemEl);
    });

    showView("game-report-view");
  } catch (error) {
    console.error("Error loading game report:", error);
    alert("Could not load game report: " + error.message);
  }
}
