const appId = "default-app-id";
let quizQuestions = [],
  currentQuestionIndex = 0,
  imageTarget = null,
  imageTargetIndex = -1;
let selectedTemplate = "default";

let currentQuizData = null,
  currentPlayersList = [],
  currentQuestionInPlayIndex = 0,
  currentGamePin = null,
  currentUserData = null,
  currentUserId = null;
let gameUnsubscribe = null,
  playerUnsubscribe = null,
  questionTimerInterval = null;

let lastKnownScore = 0;
let lastAnswerSubmitted = null;
let currentRating = 0;

function updateHostQuestionDisplay(questionIndex) {
  const display = $("host-question-display");
  if (!display) return;
  if (questionIndex === -1) {
    display.textContent = "Waiting to Start...";
  } else if (currentQuizData) {
    const qNum = questionIndex + 1;
    const totalQ = currentQuizData.questions.length;
    display.textContent = `QUESTION: ${qNum} / ${totalQ}`;
  }
}

function updatePlayerQuestionDisplay(questionIndex) {
  const display = $("player-question-display");
  if (!display) return;
  if (questionIndex === -1) {
    display.textContent = "Waiting...";
  } else if (currentQuizData) {
    const qNum = questionIndex + 1;
    const totalQ = currentQuizData.questions.length;
    display.textContent = `QUESTION: ${qNum} / ${totalQ}`;
  }
}
function listenToGameUpdates(pin, isHost) {
  if (gameUnsubscribe) gameUnsubscribe();
  if (playerUnsubscribe) playerUnsubscribe();

  if (isHost) {
    document.body.classList.add("is-host");
  } else {
    document.body.classList.remove("is-host");
  }

  const quizDocRef = doc(db, "quizzes", pin);
  const playersColRef = collection(db, "quizzes", pin, "players");

  playerUnsubscribe = onSnapshot(playersColRef, (snapshot) => {
    currentPlayersList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    currentPlayersList.sort((a, b) => b.score - a.score);
    if (isHost && $("game-lobby-view").classList.contains("active")) {
      updateLobbyList(currentPlayersList);
    }
    const leaderboardArea = $("leaderboard-area");
    if (
      (leaderboardArea && leaderboardArea.style.display === "block") ||
      (isHost &&
        currentQuizData &&
        (currentQuizData.gameState.status === "initial_leaderboard" ||
          currentQuizData.gameState.status === "question" ||
          currentQuizData.gameState.status === "leaderboard"))
    ) {
      renderLeaderboardUI(currentPlayersList, "leaderboard-area", isHost);
    }
    if ($("score-area") && $("score-area").style.display === "block") {
      renderLeaderboardUI(currentPlayersList, "score-area", isHost, true);
    }
  });

  gameUnsubscribe = onSnapshot(quizDocRef, (docSnap) => {
    if (!docSnap.exists() || !docSnap.data()) {
      if (gameUnsubscribe) gameUnsubscribe();
      if (playerUnsubscribe) playerUnsubscribe();
      showView("home-view");
      return;
    }
    currentQuizData = docSnap.data();
    if (!currentQuizData.gameState) {
      console.error("Game state is missing!", currentQuizData);
      return;
    }

    const state = currentQuizData.gameState;
    currentQuestionInPlayIndex = state.currentQuestion;

    switch (state.status) {
      case "lobby":
        if (isHost) {
          showView("game-lobby-view");
          updateLobbyList(currentPlayersList);
        } else {
          $("wait-lobby-avatar").src = currentUserData.avatarUrl || avatars[0];
          $("wait-lobby-username").textContent =
            currentUserData.name || "Player";
          showView("player-waiting-lobby");
        }
        break;
      case "initial_leaderboard":
        showView("play-quiz-view");
        if (isHost) {
          $("play-area").style.display = "none";
          $("leaderboard-area").style.display = "block";
          $("score-area").style.display = "none";
          $("player-answer-screen").style.display = "none";
          renderLeaderboardUI(currentPlayersList, "leaderboard-area", isHost);
          updateHostQuestionDisplay(-1);
        } else {
          $("wait-lobby-avatar").src = currentUserData.avatarUrl || avatars[0];
          $("wait-lobby-username").textContent =
            currentUserData.name || "Player";
          showView("player-waiting-lobby");
        }
        break;
      case "question":
        showView("play-quiz-view");
        renderPlayableQuestion(
          state.currentQuestion,
          state.questionStartTime,
          isHost,
        );
        if (isHost) {
          updateHostQuestionDisplay(state.currentQuestion);
        } else {
          updatePlayerQuestionDisplay(state.currentQuestion);
        }
        break;
      case "leaderboard":
        showView("play-quiz-view");
        if (isHost) {
          renderLeaderboardUI(currentPlayersList, "leaderboard-area", isHost);
          updateHostQuestionDisplay(state.currentQuestion);
          console.log("Host is on leaderboard, starting 5s timer...");
          setTimeout(async () => {
            const freshDoc = await getDoc(doc(db, "quizzes", currentGamePin));
            if (!freshDoc.exists()) return;
            const freshData = freshDoc.data();
            if (!freshData || freshData.gameState.status !== "leaderboard") {
              console.log("Timer fired, but state changed. Aborting.");
              return;
            }
            console.log("5s timer finished, advancing question...");
            const nextQuestionIndex = freshData.gameState.currentQuestion + 1;
            const quizDocRef = doc(db, "quizzes", currentGamePin);
            if (nextQuestionIndex < freshData.questions.length) {
              await updateDoc(quizDocRef, {
                "gameState.status": "question",
                "gameState.currentQuestion": nextQuestionIndex,
                "gameState.questionStartTime": serverTimestamp(),
              });
            } else {
              await updateDoc(quizDocRef, { "gameState.status": "finished" });
            }
          }, 5000);
        } else {
          showPlayerAnswerScreen();
        }
        break;
      case "finished":
        calculateAndShowScore(currentPlayersList, isHost);
        showView("play-quiz-view");
        break;
    }
  });
}

function updateLobbyList(players) {
  const listEl = $("lobby-players-list");
  listEl.innerHTML = "";
  if (players.length === 0) {
    listEl.innerHTML = "<li>Waiting for players...</li>";
    return;
  }
  players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    listEl.appendChild(li);
  });
}

function renderPlayableQuestion(index, startTime, isHost) {
  if (!currentQuizData) return;
  if (questionTimerInterval) clearInterval(questionTimerInterval);

  $("player-answer-screen").style.display = "none";

  const q = currentQuizData.questions[index];
  const timerBar = $("question-timer-bar");
  const questionDuration = (q.timer || 20) * 1000;
  const questionStartTime = startTime ? startTime.toDate() : new Date();

  if (isHost) {
    $("play-area").style.display = "none";
    $("leaderboard-area").style.display = "block";
    $("score-area").style.display = "none";
    renderLeaderboardUI(currentPlayersList, "leaderboard-area", isHost);
  } else {
    $("play-area").style.display = "block";
    $("leaderboard-area").style.display = "none";
    $("score-area").style.display = "none";

    $("play-question-text").textContent = q.question;
    $("play-question-image").src = q.imageUrl || "";
    $("play-question-image").style.display = q.imageUrl ? "block" : "none";

    const optionsContainer = $("play-quiz-options");
    optionsContainer.innerHTML = "";
    lastAnswerSubmitted = null;

    q.options.forEach((opt, i) => {
      const button = document.createElement("button");
      button.className = "btn play-option-btn";
      button.textContent = opt.text;
      button.dataset.index = i;

      button.onclick = async () => {
        if (isHost) return;

        optionsContainer.querySelectorAll(".play-option-btn").forEach((btn) => {
          btn.classList.remove("selected");
        });

        button.classList.add("selected");
        lastAnswerSubmitted = i;

        const playerDocRef = doc(
          db,
          "quizzes",
          currentGamePin,
          "players",
          currentUserId,
        );
        await setDoc(
          playerDocRef,
          {
            lastAnswerIndex: i,
            lastAnswerTime: serverTimestamp(),
          },
          { merge: true },
        );
      };
      optionsContainer.appendChild(button);
    });
  }

  questionTimerInterval = setInterval(async () => {
    const elapsed = new Date() - questionStartTime;
    let remaining = questionDuration - elapsed;
    if (remaining < 0) remaining = 0;

    if (!isHost) {
      timerBar.style.width = (remaining / questionDuration) * 100 + "%";
    }

    if (remaining <= 0) {
      clearInterval(questionTimerInterval);
      if (isHost) {
        console.log("Host timer finished, calculating scores...");
        await showLeaderboard();
      } else {
        $("play-quiz-options")
          .querySelectorAll(".play-option-btn")
          .forEach((btn) => (btn.disabled = true));
      }
    }
  }, 100);
}

$("join-game-btn").addEventListener("click", () => showView("join-quiz-view"));
$("join-quiz-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pin = $("game-pin-input").value.trim();
  const errorLabel = $("join-error-label");
  if (!pin) return;
  errorLabel.textContent = "";
  const quizDocRef = doc(db, "quizzes", pin);
  const docSnap = await getDoc(quizDocRef);
  if (docSnap.exists()) {
    const quizData = docSnap.data();
    if (
      quizData.gameState &&
      (quizData.gameState.status === "lobby" ||
        quizData.gameState.status === "initial_leaderboard")
    ) {
      currentGamePin = pin;
      lastKnownScore = 0;
      lastAnswerSubmitted = null;
      await setDoc(doc(db, "quizzes", pin, "players", currentUserId), {
        name: currentUserData.name,
        avatarUrl: currentUserData.avatarUrl,
        score: 0,
        lastAnswerIndex: null,
        answers: [],
      });

      const newJoinedGame = { pin: pin, name: quizData.quizName };
      await updateDoc(doc(db, "users", currentUserId), {
        joinedGames: arrayUnion(newJoinedGame),
      });
      if (currentUserData) {
        if (!currentUserData.joinedGames) currentUserData.joinedGames = [];
        if (!currentUserData.joinedGames.some((g) => g.pin === pin)) {
          currentUserData.joinedGames.push(newJoinedGame);
        }
      }

      $("wait-lobby-avatar").src = currentUserData.avatarUrl || avatars[0];
      $("wait-lobby-username").textContent = currentUserData.name || "Player";
      showView("player-waiting-lobby");
      listenToGameUpdates(pin, false);
    } else {
      errorLabel.textContent =
        "This game is not available to join (it may have already started).";
    }
  } else {
    errorLabel.textContent =
      "Invalid PIN. Please check the code and try again.";
  }
});

$("start-game-btn").addEventListener("click", async () => {
  if (!currentGamePin) return;
  await updateDoc(doc(db, "quizzes", currentGamePin), {
    "gameState.status": "initial_leaderboard",
  });
});

$("host-next-btn").addEventListener("click", async () => {
  if (!currentQuizData || !currentGamePin) return;
  const quizDocRef = doc(db, "quizzes", currentGamePin);
  const currentState = currentQuizData.gameState.status;
  if (currentState === "initial_leaderboard") {
    await updateDoc(quizDocRef, {
      "gameState.status": "question",
      "gameState.currentQuestion": 0,
      "gameState.questionStartTime": serverTimestamp(),
    });
  }
});

function startNewQuiz() {
  quizQuestions = [
    {
      question: "",
      imageUrl: null,
      options: [
        { text: "", imageUrl: null },
        { text: "", imageUrl: null },
      ],
      correctAnswerIndex: 0,
      timer: 20,
    },
  ];
  currentQuestionIndex = 0;
  renderCurrentQuestion();
}
function renderCurrentQuestion() {
  const q = quizQuestions[currentQuestionIndex];
  $("question-input").value = q.question || "";
  $("timer-input").value = q.timer || 20;
  const qImagePreview = $("question-image-preview");
  qImagePreview.src = q.imageUrl || "";
  qImagePreview.style.display = q.imageUrl ? "block" : "none";
  document.querySelector(
    "#create-quiz-view .question-card-input label",
  ).textContent = `Q${currentQuestionIndex + 1}`;
  $("options-container").innerHTML = "";
  q.options.forEach((opt, index) => {
    const optionEl = document.createElement("div");
    optionEl.className = "option-input";
    let imgHTML = "";
    if (opt.imageUrl) {
      imgHTML = `<img src="${opt.imageUrl}" class="image-preview">`;
    }
    optionEl.innerHTML = `<div class="correct-answer-toggle ${index === q.correctAnswerIndex ? "selected" : ""}" data-index="${index}"></div><div class="input-with-icon"><input type="text" value="${opt.text || ""}" placeholder="Enter Option ${index + 1}"><button class="add-image-button" data-target="option" data-index="${index}"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E" alt="Add"></button></div>${imgHTML}`;
    $("options-container").appendChild(optionEl);
  });
  updateQuestionCounter();
}
function saveCurrentQuestionState() {
  const q = quizQuestions[currentQuestionIndex];
  q.question = $("question-input").value.trim();
  q.timer = parseInt($("timer-input").value) || 20;
  const optionInputs = $("options-container").querySelectorAll(".option-input");
  q.options = Array.from(optionInputs).map((optEl, index) => {
    const text = optEl.querySelector("input").value.trim();
    const existingImageUrl = q.options[index]
      ? q.options[index].imageUrl
      : null;
    return { text, imageUrl: existingImageUrl };
  });
}
function updateQuestionCounter() {
  $("question-counter-display").textContent =
    `Questions: ${quizQuestions.length}`;
  $("prev-question-btn").disabled = currentQuestionIndex === 0;
  $("next-question-btn").disabled =
    currentQuestionIndex === quizQuestions.length - 1;
}
function renderFinalizeList() {
  $("finalize-list").innerHTML = "";
  quizQuestions.forEach((q, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${q.question}`;
    $("finalize-list").appendChild(li);
  });
}
$("import-excel-btn").addEventListener("click", () =>
  $("excel-file-input").click(),
);

$("excel-file-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const importMessage = $("import-message");
  importMessage.textContent = "Processing file...";
  importMessage.style.color = "var(--text-color)";
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        importMessage.style.color = "var(--incorrect-red)";
        importMessage.textContent =
          "The Excel sheet is empty or in an incorrect format.";
        return;
      }

      const headers = jsonData[0].map((h) => String(h).toLowerCase().trim());
      const dataRows = jsonData.slice(1);

      const questionIndex = headers.indexOf("question");
      const imageIndex = headers.indexOf("image");
      const timerIndex = headers.indexOf("timer");
      const answerIndex = headers.indexOf("answer");

      const optionIndices = [];
      headers.forEach((h, i) => {
        if (h.startsWith("option")) {
          optionIndices.push({ key: h, index: i });
        }
      });
      optionIndices.sort((a, b) => a.key.localeCompare(b.key));

      if (
        questionIndex === -1 ||
        answerIndex === -1 ||
        optionIndices.length === 0
      ) {
        importMessage.style.color = "var(--incorrect-red)";
        importMessage.textContent =
          "Missing required columns: 'question', 'answer', and at least one 'option' column.";
        return;
      }

      const newQuestions = dataRows
        .map((row) => {
          const questionText = String(row[questionIndex] || "");
          if (!questionText) return null;

          const options = optionIndices
            .map((opt) => ({
              text: String(row[opt.index] || "").trim(),
              imageUrl: null,
            }))
            .filter((opt) => opt.text);

          const rawAnswer = String(row[answerIndex] || "")
            .trim()
            .toLowerCase();
          let cIndex = -1;
          if (rawAnswer.length === 1) {
            cIndex = rawAnswer.charCodeAt(0) - 97;
          } else {
            cIndex = options.findIndex(
              (opt) => opt.text.toLowerCase() === rawAnswer,
            );
          }
          if (cIndex < 0 || cIndex >= options.length) cIndex = 0;

          let imageUrl =
            imageIndex > -1 &&
            row[imageIndex] &&
            String(row[imageIndex]).toLowerCase() !== "n/a"
              ? String(row[imageIndex]).trim()
              : null;

          let timer = 20;
          if (timerIndex > -1 && row[timerIndex]) {
            const parsedTimer = parseInt(String(row[timerIndex]));
            if (!isNaN(parsedTimer)) timer = parsedTimer;
          }

          return {
            question: questionText,
            imageUrl: imageUrl,
            options:
              options.length > 0 ? options : [{ text: "", imageUrl: null }],
            correctAnswerIndex: cIndex,
            timer: timer,
          };
        })
        .filter((q) => q !== null);

      if (newQuestions.length > 0) {
        quizQuestions = newQuestions;
        currentQuestionIndex = 0;
        renderCurrentQuestion();
        importMessage.style.color = "var(--success-green)";
        importMessage.textContent = `${newQuestions.length} questions imported successfully!`;
      } else {
        importMessage.style.color = "var(--incorrect-red)";
        importMessage.textContent = "No valid questions found in the file.";
      }
    } catch (error) {
      console.error("Error processing Excel file:", error);
      importMessage.style.color = "var(--incorrect-red)";
      importMessage.textContent =
        "Failed to process file. Ensure it's a valid .xlsx or .xls file.";
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
});
