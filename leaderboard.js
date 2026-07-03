async function showLeaderboard() {
  if (!currentQuizData || !currentGamePin) return;
  const q = currentQuizData.questions[currentQuestionInPlayIndex];
  const questionStartTime =
    currentQuizData.gameState.questionStartTime.toDate();
  const questionDuration = (q.timer || 20) * 1000;
  const playersColRef = collection(db, "quizzes", currentGamePin, "players");
  const playersSnapshot = await getDocs(playersColRef);
  for (const playerDoc of playersSnapshot.docs) {
    const playerData = playerDoc.data();
    let scoreToAdd = 0;
    let isCorrect = false;

    if (
      playerData.lastAnswerIndex != null &&
      playerData.lastAnswerIndex === q.correctAnswerIndex
    ) {
      const answerTime = playerData.lastAnswerTime
        ? playerData.lastAnswerTime.toDate()
        : new Date();
      const timeTaken = answerTime - questionStartTime;
      isCorrect = true;
      if (timeTaken < questionDuration && timeTaken > 0) {
        scoreToAdd = Math.round(
          1000 * ((questionDuration - timeTaken) / questionDuration),
        );
      }
    }

    const answerReport = {
      question: q.question,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      submittedAnswerIndex: playerData.lastAnswerIndex,
      isCorrect: isCorrect,
      scoreGained: scoreToAdd,
    };

    await updateDoc(playerDoc.ref, {
      score: increment(scoreToAdd),
      lastAnswerIndex: null,
      lastAnswerTime: null,
      answers: arrayUnion(answerReport),
    });
  }
  await updateDoc(doc(db, "quizzes", currentGamePin), {
    "gameState.status": "leaderboard",
  });
}

function showPlayerAnswerScreen() {
  $("play-area").style.display = "none";
  $("leaderboard-area").style.display = "none";
  $("score-area").style.display = "none";
  $("player-answer-screen").style.display = "block";

  const myData = currentPlayersList.find((p) => p.id === currentUserId);
  if (!myData || !currentQuizData) return;

  const q = currentQuizData.questions[currentQuestionInPlayIndex];

  const newScore = myData.score;
  const scoreGained = newScore - lastKnownScore;
  lastKnownScore = newScore;

  const isCorrect = lastAnswerSubmitted === q.correctAnswerIndex;

  const icon = $("player-answer-icon");
  const title = $("player-answer-title");
  const points = $("player-answer-points");
  const correctText = $("player-answer-correct-text");
  const rankInfo = $("player-answer-rank-info");

  if (isCorrect) {
    icon.className = "answer-icon correct";
    icon.innerHTML = "✓";
    title.textContent = "Correct!";
    title.style.color = "var(--success-green)";
    points.textContent = `+${scoreGained} Points`;
    points.style.color = "var(--success-green)";
    correctText.style.display = "none";
  } else {
    icon.className = "answer-icon incorrect";
    icon.innerHTML = "×";
    title.textContent = "Incorrect!";
    title.style.color = "var(--incorrect-red)";
    points.textContent = "+0 Points";
    points.style.color = "var(--incorrect-red)";
    correctText.style.display = "block";
    correctText.textContent = `The correct answer was: ${q.options[q.correctAnswerIndex].text}`;
  }

  $("player-answer-score").textContent = newScore;

  const myRank =
    currentPlayersList.findIndex((p) => p.id === currentUserId) + 1;
  if (myRank > 0) {
    const suffix =
      myRank === 1 ? "st" : myRank === 2 ? "nd" : myRank === 3 ? "rd" : "th";
    rankInfo.textContent = `You are in ${myRank}${suffix} place!`;
    if (myRank > 1) {
      const pointsBehind = currentPlayersList[myRank - 2].score - newScore;
      if (pointsBehind > 0) {
        rankInfo.textContent += ` You are ${pointsBehind} points behind ${currentPlayersList[myRank - 2].name}.`;
      }
    }
  } else {
    rankInfo.textContent = "You are not on the leaderboard yet.";
  }
}

function renderLeaderboardUI(players, containerId, isHost, isFinal = false) {
  const container = $(containerId);
  if (!container) return;

  if (!isFinal) {
    if (!isHost) {
      // This is handled by showPlayerAnswerScreen
    }
  }

  const listEl = container.querySelector(".leaderboard-rest");
  const top3Container = container.querySelector(".leaderboard-top3");
  if (listEl) listEl.innerHTML = "";
  const place1El = top3Container
    ? top3Container.querySelector(".place-1")
    : null;
  const place2El = top3Container
    ? top3Container.querySelector(".place-2")
    : null;
  const place3El = top3Container
    ? top3Container.querySelector(".place-3")
    : null;
  if (place1El) place1El.innerHTML = "";
  if (place2El) place2El.innerHTML = "";
  if (place3El) place3El.innerHTML = "";
  if (players.length > 0 && place1El) {
    place1El.innerHTML = `
                    <div class="leaderboard-avatar-box">
                        <img src="${players[0].avatarUrl || avatars[0]}" class="leaderboard-avatar">
                        <span class="leaderboard-rank-badge crown">👑</span>
                    </div>
                    <span class="leaderboard-name">${players[0].name}</span>
                    <span class="leaderboard-score">${players[0].score}</span>
                `;
  }
  if (players.length > 1 && place2El) {
    place2El.innerHTML = `
                    <div class="leaderboard-avatar-box">
                        <img src="${players[1].avatarUrl || avatars[0]}" class="leaderboard-avatar">
                        <span class="leaderboard-rank-badge">2</span>
                    </div>
                    <span class="leaderboard-name">${players[1].name}</span>
                    <span class="leaderboard-score">${players[1].score}</span>
                `;
  }
  if (players.length > 2 && place3El) {
    place3El.innerHTML = `
                    <div class="leaderboard-avatar-box">
                        <img src="${players[2].avatarUrl || avatars[0]}" class="leaderboard-avatar">
                        <span class="leaderboard-rank-badge">3</span>
                    </div>
                    <span class="leaderboard-name">${players[2].name}</span>
                    <span class="leaderboard-score">${players[2].score}</span>
                `;
  }
  if (listEl) {
    players.slice(3).forEach((player, index) => {
      const li = document.createElement("li");
      li.className = "leaderboard-item-rest";
      li.innerHTML = `
                        <span class="leaderboard-rank">#${index + 4}</span>
                        <img src="${player.avatarUrl || avatars[0]}" class="leaderboard-avatar" />
                        <span class="leaderboard-name">${player.name}</span>
                        <span class="leaderboard-score">${player.score}</span>
                    `;
      listEl.appendChild(li);
    });
  }
  if (containerId === "leaderboard-area") {
    const hostNextBtn = $("host-next-btn");
    if (!hostNextBtn) return;

    if (isHost) {
      const currentState = currentQuizData
        ? currentQuizData.gameState.status
        : "";
      if (currentState === "initial_leaderboard") {
        hostNextBtn.style.display = "block";
        hostNextBtn.textContent = "Start First Question";
      } else {
        hostNextBtn.style.display = "none";
      }
    } else {
      hostNextBtn.style.display = "none";
    }
  }
}

async function calculateAndShowScore(players, isHost) {
  if (!currentQuizData) return;
  $("play-area").style.display = "none";
  $("leaderboard-area").style.display = "none";
  $("player-answer-screen").style.display = "none";
  $("score-area").style.display = "block";

  const myData = players.find((p) => p.id === currentUserId);
  const myScore = myData ? myData.score : 0;

  $("quiz-score-display").textContent = myScore;

  renderLeaderboardUI(players, "score-area", isHost, true);

  // --- NEW: Update Podium Finishes ---
  try {
    if (players[0]) {
      await updateDoc(doc(db, "users", players[0].id), {
        "ranks.first": increment(1),
      });
    }
    if (players[1]) {
      await updateDoc(doc(db, "users", players[1].id), {
        "ranks.second": increment(1),
      });
    }
    if (players[2]) {
      await updateDoc(doc(db, "users", players[2].id), {
        "ranks.third": increment(1),
      });
    }
  } catch (err) {
    console.error("Error updating player ranks:", err);
  }

  if (gameUnsubscribe) gameUnsubscribe();
  if (playerUnsubscribe) playerUnsubscribe();
  currentGamePin = null;
  currentQuizData = null;
  currentPlayersList = [];
}
$("play-again-btn").addEventListener("click", () => showView("home-view"));
