import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { appState, $, showView } from "./app.js";

let quizQuestions = [],
  currentQuestionIndex = 0,
  imageTarget = null,
  imageTargetIndex = -1;
let selectedTemplate = "default";
const stickers = ["⭐", "❤️", "💡", "❓", "🎯", "🎉", "💯", "✔️"];

export function initQuiz() {
  $("create-game-btn").addEventListener("click", () =>
    showView("template-choice-view"),
  );

  $("default-template-btn").addEventListener("click", () => {
    selectedTemplate = "default";
    $("default-template-btn").classList.add("active");
    $("custom-template-btn").classList.remove("active");
  });
  $("custom-template-btn").addEventListener("click", () => {
    selectedTemplate = "custom";
    $("custom-template-btn").classList.add("active");
    $("default-template-btn").classList.remove("active");
  });

  $("confirm-template-btn").addEventListener("click", () => {
    const createView = $("create-quiz-view");
    if (selectedTemplate === "default") {
      createView.classList.add("template-mode-default");
      createView.classList.remove("template-mode-custom");
    } else {
      createView.classList.add("template-mode-custom");
      createView.classList.remove("template-mode-default");
    }
    quizQuestions = [];
    showView("create-quiz-view");
  });

  $("options-container").addEventListener("click", (e) => {
    if (e.target.closest(".correct-answer-toggle")) {
      saveCurrentQuestionState();
      quizQuestions[currentQuestionIndex].correctAnswerIndex = parseInt(
        e.target.closest(".correct-answer-toggle").dataset.index,
      );
      renderCurrentQuestion();
    }
  });
  $("add-option-btn").addEventListener("click", () => {
    saveCurrentQuestionState();
    quizQuestions[currentQuestionIndex].options.push({
      text: "",
      imageUrl: null,
    });
    renderCurrentQuestion();
  });
  $("prev-question-btn").addEventListener("click", () => {
    saveCurrentQuestionState();
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderCurrentQuestion();
    }
  });
  $("next-question-btn").addEventListener("click", () => {
    saveCurrentQuestionState();
    if (currentQuestionIndex < quizQuestions.length - 1) {
      currentQuestionIndex++;
      renderCurrentQuestion();
    }
  });

  $("add-question-btn").addEventListener("click", () => {
    saveCurrentQuestionState();
    quizQuestions.push({
      question: "",
      imageUrl: null,
      options: [
        { text: "", imageUrl: null },
        { text: "", imageUrl: null },
      ],
      correctAnswerIndex: 0,
      timer: 20,
    });
    currentQuestionIndex = quizQuestions.length - 1;
    renderCurrentQuestion();
  });

  $("remove-question-btn").addEventListener("click", () => {
    const importMessage = $("import-message");
    if (quizQuestions.length > 1) {
      quizQuestions.splice(currentQuestionIndex, 1);
      if (currentQuestionIndex >= quizQuestions.length)
        currentQuestionIndex = quizQuestions.length - 1;
      renderCurrentQuestion();
      importMessage.textContent = "";
    } else {
      importMessage.style.color = "var(--incorrect-red)";
      importMessage.textContent = "You can't remove the only question!";
      setTimeout(() => (importMessage.textContent = ""), 3000);
    }
  });

  $("submit-quiz-btn").addEventListener("click", () => {
    saveCurrentQuestionState();
    showView("finalize-quiz-view");
  });
  $("edit-quiz-again-btn").addEventListener("click", () =>
    showView("create-quiz-view"),
  );
  $("back-to-home-btn").addEventListener("click", () => showView("home-view"));
  $("play-again-btn").addEventListener("click", () => showView("home-view"));

  $("lobby-copy-pin-btn").addEventListener("click", () => {
    copyText(
      $("lobby-pin-display").textContent,
      "lobby-copy-pin-btn",
      "Copy PIN",
    );
  });
  $("lobby-share-btn").addEventListener("click", () => {
    shareToWhatsApp($("lobby-pin-display").textContent);
  });
  $("copy-pin-btn").addEventListener("click", () => {
    copyText($("game-pin-display").textContent, "copy-pin-btn", "Copy PIN");
  });
  $("share-pin-btn").addEventListener("click", () => {
    shareToWhatsApp($("game-pin-display").textContent);
  });

  document.querySelector(".quiz-editor-main").addEventListener("click", (e) => {
    const icon = e.target.closest(".add-image-button");
    if (icon) {
      imageTarget = icon.dataset.target;
      imageTargetIndex = icon.dataset.index ? parseInt(icon.dataset.index) : -1;
      $("add-image-modal").style.display = "flex";
    }
  });
  $("cancel-image-btn").addEventListener("click", () => {
    $("add-image-modal").style.display = "none";
  });
  $("save-image-btn").addEventListener("click", () => {
    const imageUrl = $("image-url-input").value.trim();
    if (imageUrl) {
      saveCurrentQuestionState();
      if (imageTarget === "question") {
        quizQuestions[currentQuestionIndex].imageUrl = imageUrl;
      } else if (imageTarget === "option") {
        quizQuestions[currentQuestionIndex].options[imageTargetIndex].imageUrl =
          imageUrl;
      }
      renderCurrentQuestion();
    }
    $("add-image-modal").style.display = "none";
    $("image-url-input").value = "";
  });

  $("change-bg-btn").addEventListener("click", () => {
    $("change-background-modal").style.display = "flex";
  });
  $("done-bg-btn").addEventListener("click", () => {
    $("change-background-modal").style.display = "none";
  });
  $("set-color-btn").addEventListener("click", () => {
    document.body.style.backgroundColor = $("bg-color-input").value;
  });
  $("reset-color-btn").addEventListener("click", () => {
    document.body.style.backgroundColor = "var(--bg-color)";
  });
  $("set-bg-image-btn").addEventListener("click", () => {
    const url = $("bg-image-url-input").value.trim();
    if (url) document.body.style.backgroundImage = `url(${url})`;
  });
  $("clear-bg-image-btn").addEventListener("click", () => {
    document.body.style.backgroundImage = "none";
  });

  $("add-sticker-btn").addEventListener("click", () => {
    if ($("sticker-grid").childElementCount === 0) populateStickerGrid();
    $("add-sticker-modal").style.display = "flex";
  });
  $("close-sticker-modal-btn").addEventListener("click", () => {
    $("add-sticker-modal").style.display = "none";
  });
  $("sticker-grid").addEventListener("click", (e) => {
    if (e.target.classList.contains("sticker-option")) {
      const sticker = document.createElement("div");
      sticker.className = "placed-sticker";
      sticker.textContent = e.target.textContent;
      sticker.style.left = "50%";
      sticker.style.top = "50%";
      $("sticker-canvas").appendChild(sticker);
      makeDraggable(sticker);
      $("add-sticker-modal").style.display = "none";
    }
  });

  $("import-excel-btn").addEventListener("click", () =>
    $("excel-file-input").click(),
  );
  $("excel-file-input").addEventListener("change", handleExcelUpload);

  $("generate-pin-btn").addEventListener("click", generateQuizPinAndSave);
  $("join-quiz-form").addEventListener("submit", joinQuizHandler);

  // --- Local File Upload Handler System Integration ---
  const localFileInput = document.getElementById("local-file-input");
  if (localFileInput) {
    localFileInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        const fileNameDisplay = document.getElementById("file-name-display");
        if (fileNameDisplay) {
          fileNameDisplay.textContent = file.name;
        }

        saveCurrentQuestionState();
        const localImageURL = URL.createObjectURL(file);

        // Save URL string into state so it targets the correct element securely
        if (quizQuestions.length > 0) {
          quizQuestions[currentQuestionIndex].imageUrl = localImageURL;
        }

        displayImageOnCard(localImageURL);
      }
    });
  }

  // Real-Time Control System Triggers
  $("start-game-btn").addEventListener("click", async () => {
    if (appState.currentGamePin) {
      await updateDoc(doc(appState.db, "quizzes", appState.currentGamePin), {
        "gameState.status": "question",
        "gameState.currentQuestion": 0,
        "gameState.questionStartTime": serverTimestamp(),
      });
    }
  });

  $("host-next-btn").addEventListener("click", async () => {
    if (!appState.currentQuizData || !appState.currentGamePin) return;
    const state = appState.currentQuizData.gameState;
    const quizDocRef = doc(appState.db, "quizzes", appState.currentGamePin);

    if (state.status === "leaderboard") {
      const nextIdx = state.currentQuestion + 1;
      if (nextIdx < appState.currentQuizData.questions.length) {
        await updateDoc(quizDocRef, {
          "gameState.status": "question",
          "gameState.currentQuestion": nextIdx,
          "gameState.questionStartTime": serverTimestamp(),
        });
      } else {
        await updateDoc(quizDocRef, { "gameState.status": "finished" });
      }
    }
  });

  $("back-to-profile-from-report-btn").addEventListener("click", () =>
    showView("profile-view"),
  );
  $("back-to-profile-from-game-btn").addEventListener("click", () =>
    showView("profile-view"),
  );
}

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

function updateQuestionCounter() {
  $("question-counter-display").textContent =
    `Questions: ${quizQuestions.length}`;
  $("prev-question-btn").disabled = currentQuestionIndex === 0;
  $("next-question-btn").disabled =
    currentQuestionIndex === quizQuestions.length - 1;
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
    let imgHTML = opt.imageUrl
      ? `<img src="${opt.imageUrl}" class="image-preview">`
      : "";
    optionEl.innerHTML = `<div class="correct-answer-toggle ${index === q.correctAnswerIndex ? "selected" : ""}" data-index="${index}"></div><div class="input-with-icon"><input type="text" value="${opt.text || ""}" placeholder="Enter Option ${index + 1}"><button class="add-image-button" data-target="option" data-index="${index}"><img src="data:image/svg+xml,%3Csvg..." alt="Add"></button></div>${imgHTML}`;
    $("options-container").appendChild(optionEl);
  });
  updateQuestionCounter();
}

function saveCurrentQuestionState() {
  if (quizQuestions.length === 0) return;
  const q = quizQuestions[currentQuestionIndex];
  q.question = $("question-input").value.trim();
  q.timer = parseInt($("timer-input").value) || 20;
  q.maxPoints = parseInt($("points-input").value) || 1000;

  const optionInputs = $("options-container").querySelectorAll(".option-input");
  q.options = Array.from(optionInputs).map((optEl, index) => {
    const text = optEl.querySelector("input").value.trim();
    const existingImageUrl = q.options[index]
      ? q.options[index].imageUrl
      : null;
    return { text, imageUrl: existingImageUrl };
  });
}

export function renderFinalizeList() {
  $("finalize-list").innerHTML = "";
  quizQuestions.forEach((q, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${q.question}`;
    $("finalize-list").appendChild(li);
  });
}

function populateStickerGrid() {
  $("sticker-grid").innerHTML = "";
  stickers.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "sticker-option";
    btn.textContent = s;
    $("sticker-grid").appendChild(btn);
  });
}

function makeDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  element.onmousedown = (e) => {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = () => {
      document.onmouseup = null;
      document.onmousemove = null;
    };
    document.onmousemove = (e) => {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    };
  };
}

function shareToWhatsApp(pin) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(`Enter this Game PIN to join: ${pin}`)}`,
    "_blank",
  );
}

function copyText(text, btnId, defaultText) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    $(btnId).textContent = "Copied!";
  } catch (err) {
    $(btnId).textContent = "Error";
  }
  document.body.removeChild(textArea);
  setTimeout(() => {
    $(btnId).textContent = defaultText;
  }, 2000);
}

function handleExcelUpload(event) {
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
        importMessage.textContent = "The Excel sheet is empty.";
        return;
      }
      const headers = jsonData[0].map((h) => String(h).toLowerCase().trim());
      const dataRows = jsonData.slice(1);
      const questionIndex = headers.indexOf("question"),
        imageIndex = headers.indexOf("image"),
        timerIndex = headers.indexOf("timer"),
        answerIndex = headers.indexOf("answer");
      const optionIndices = [];
      headers.forEach((h, i) => {
        if (h.startsWith("option")) optionIndices.push({ key: h, index: i });
      });
      optionIndices.sort((a, b) => a.key.localeCompare(b.key));
      if (
        questionIndex === -1 ||
        answerIndex === -1 ||
        optionIndices.length === 0
      ) {
        importMessage.style.color = "var(--incorrect-red)";
        importMessage.textContent = "Missing required columns.";
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
          let cIndex =
            rawAnswer.length === 1
              ? rawAnswer.charCodeAt(0) - 97
              : options.findIndex(
                  (opt) => opt.text.toLowerCase() === rawAnswer,
                );
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
        importMessage.textContent = "No valid questions found.";
      }
    } catch (error) {
      importMessage.style.color = "var(--incorrect-red)";
      importMessage.textContent = "Failed to process file.";
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
}

async function generateQuizPinAndSave() {
  const finalizeMessage = $("finalize-message");
  finalizeMessage.textContent = "";
  const quizName = $("quiz-name-input").value.trim();
  if (!quizName) {
    finalizeMessage.style.color = "var(--incorrect-red)";
    finalizeMessage.textContent = "Please enter a name for your quiz.";
    return;
  }
  try {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const quizDocRef = doc(appState.db, "quizzes", pin);
    await setDoc(quizDocRef, {
      creatorId: appState.currentUserId,
      questions: quizQuestions,
      createdAt: serverTimestamp(),
      quizName: quizName,
      gameState: {
        status: "lobby",
        currentQuestion: -1,
        questionStartTime: null,
      },
    });
    const newGameEntry = { pin: pin, name: quizName };
    await updateDoc(doc(appState.db, "users", appState.currentUserId), {
      createdGames: arrayUnion(newGameEntry),
    });
    if (appState.currentUserData) {
      if (!appState.currentUserData.createdGames)
        appState.currentUserData.createdGames = [];
      appState.currentUserData.createdGames.push(newGameEntry);
    }
    appState.currentGamePin = pin;
    $("lobby-pin-display").textContent = pin;
    listenToGameUpdates(pin, true);
    showView("game-lobby-view");
  } catch (error) {
    finalizeMessage.textContent = "Could not create game: " + error.message;
  }
}

async function joinQuizHandler(e) {
  e.preventDefault();
  const pin = $("game-pin-input").value.trim();
  const errorLabel = $("join-error-label");
  if (!pin) return;
  errorLabel.textContent = "";
  const docSnap = await getDoc(doc(appState.db, "quizzes", pin));
  if (docSnap.exists()) {
    const quizData = docSnap.data();
    if (quizData.gameState && quizData.gameState.status === "lobby") {
      appState.currentGamePin = pin;
      appState.lastKnownScore = 0;
      appState.lastAnswerSubmitted = null;
      await setDoc(
        doc(appState.db, "quizzes", pin, "players", appState.currentUserId),
        {
          name: appState.currentUserData.name,
          avatarUrl: appState.currentUserData.avatarUrl,
          score: 0,
          lastAnswerIndex: null,
          answers: [],
        },
      );
      const newJoinedGame = { pin: pin, name: quizData.quizName };
      await updateDoc(doc(appState.db, "users", appState.currentUserId), {
        joinedGames: arrayUnion(newJoinedGame),
      });
      if (appState.currentUserData) {
        if (!appState.currentUserData.joinedGames)
          appState.currentUserData.joinedGames = [];
        if (!appState.currentUserData.joinedGames.some((g) => g.pin === pin))
          appState.currentUserData.joinedGames.push(newJoinedGame);
      }
      $("wait-lobby-avatar").src =
        appState.currentUserData.avatarUrl || appState.avatars[0];
      $("wait-lobby-username").textContent =
        appState.currentUserData.name || "Player";
      showView("player-waiting-lobby");
      listenToGameUpdates(pin, false);
    } else {
      errorLabel.textContent = "This game has already started.";
    }
  } else {
    errorLabel.textContent = "Invalid PIN.";
  }
}

function listenToGameUpdates(pin, isHost) {
  if (appState.gameUnsubscribe) appState.gameUnsubscribe();
  if (appState.playerUnsubscribe) appState.playerUnsubscribe();
  if (isHost) document.body.classList.add("is-host");
  else document.body.classList.remove("is-host");

  appState.playerUnsubscribe = onSnapshot(
    collection(appState.db, "quizzes", pin, "players"),
    (snapshot) => {
      appState.currentPlayersList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.score - a.score);

      if ($("game-lobby-view").classList.contains("active")) {
        updateLobbyList(appState.currentPlayersList);
      }

      if (!isHost && $("play-area").style.display === "block") {
        const answeredCount = appState.currentPlayersList.filter(
          (p) => p.lastAnswerIndex !== null && p.lastAnswerIndex !== undefined,
        ).length;
        $("play-message").textContent =
          `Responses Submitted: ${answeredCount} / ${appState.currentPlayersList.length}`;
      }

      if (
        $("leaderboard-area").style.display === "block" ||
        (isHost &&
          appState.currentQuizData &&
          ["question", "leaderboard"].includes(
            appState.currentQuizData.gameState.status,
          ))
      ) {
        renderLeaderboardUI(
          appState.currentPlayersList,
          "leaderboard-area",
          isHost,
        );
      }
      if ($("score-area").style.display === "block")
        renderLeaderboardUI(
          appState.currentPlayersList,
          "score-area",
          isHost,
          true,
        );
    },
  );

  appState.gameUnsubscribe = onSnapshot(
    doc(appState.db, "quizzes", pin),
    (docSnap) => {
      if (!docSnap.exists() || !docSnap.data()) {
        if (appState.gameUnsubscribe) appState.gameUnsubscribe();
        if (appState.playerUnsubscribe) appState.playerUnsubscribe();
        showView("home-view");
        return;
      }
      appState.currentQuizData = docSnap.data();
      const state = appState.currentQuizData.gameState;
      appState.currentQuestionInPlayIndex = state.currentQuestion;

      switch (state.status) {
        case "lobby":
          if (isHost) {
            showView("game-lobby-view");
            updateLobbyList(appState.currentPlayersList);
          } else showView("player-waiting-lobby");
          break;
        case "question":
          showView("play-quiz-view");
          renderPlayableQuestion(
            state.currentQuestion,
            state.questionStartTime,
            isHost,
          );
          break;
        case "leaderboard":
          showView("play-quiz-view");
          if (isHost) {
            renderLeaderboardUI(
              appState.currentPlayersList,
              "leaderboard-area",
              isHost,
            );
          } else {
            showPlayerAnswerScreen();
          }
          break;
        case "finished":
          calculateAndShowScore(appState.currentPlayersList, isHost);
          showView("play-quiz-view");
          break;
      }
    },
  );
}

function updateLobbyList(players) {
  const listEl = $("lobby-players-list");
  listEl.innerHTML = "";
  if (players.length === 0) {
    listEl.innerHTML = "<li>Waiting for players...</li>";
    return;
  }
  players.forEach((p) => {
    const li = document.createElement("li");
    li.className = "lobby-player-pill animated-pop";
    li.innerHTML = `<span>👤 ${p.name}</span>`;
    listEl.appendChild(li);
  });
}

function renderPlayableQuestion(index, startTime, isHost) {
  if (appState.questionTimerInterval)
    clearInterval(appState.questionTimerInterval);
  $("player-answer-screen").style.display = "none";

  const q = appState.currentQuizData.questions[index];
  const questionDuration = (q.timer || 20) * 1000;
  const questionStartTime = startTime ? startTime.toDate() : new Date();
  const qLabel = `QUESTION: ${index + 1} / ${appState.currentQuizData.questions.length}`;

  if (isHost) {
    $("play-area").style.display = "none";
    $("leaderboard-area").style.display = "block";
    $("score-area").style.display = "none";
    $("host-question-display").textContent = qLabel;

    const listEl = grandfatherLeaderboardReset();
    listEl.innerHTML = `
            <div class="host-question-card animated-pop">
                <h2>${q.question}</h2>
                <div id="host-response-tracker">Responses: 0 / 0</div>
                <div class="timer-container-professional">
                    <div id="host-digital-timer" class="digital-countdown-clock">--</div>
                    <div class="timer-bar-container"><div class="timer-bar" id="host-timer-bar"></div></div>
                </div>
            </div>
        `;
    $("leaderboard-area").querySelector(".leaderboard-top3").style.display =
      "none";
    $("host-next-btn").style.display = "none";
  } else {
    $("play-area").style.display = "block";
    $("leaderboard-area").style.display = "none";
    $("score-area").style.display = "none";

    $("player-question-display").textContent = qLabel;
    $("play-question-text").textContent = q.question;
    $("play-question-image").src = q.imageUrl || "";
    $("play-question-image").style.display = q.imageUrl ? "block" : "none";

    const optionsContainer = grandfatherOptionsContainerReset();
    optionsContainer.innerHTML = "";
    appState.lastAnswerSubmitted = null;

    const oldBonusIndicator = $("play-area").querySelector(
      ".speed-bonus-indicator",
    );
    if (oldBonusIndicator) oldBonusIndicator.remove();

    const bonusNotice = document.createElement("div");
    bonusNotice.className = "speed-bonus-indicator animated-pop";
    bonusNotice.textContent = "⚡ Faster answers earn up to +500 bonus points!";
    $("play-question-text").insertAdjacentElement("afterend", bonusNotice);

    q.options.forEach((opt, i) => {
      const button = document.createElement("button");
      button.className = "btn play-option-btn";
      button.textContent = opt.text;
      button.dataset.index = i;

      button.onclick = async () => {
        optionsContainer
          .querySelectorAll(".play-option-btn")
          .forEach((b) => b.classList.remove("selected"));
        button.classList.add("selected");
        appState.lastAnswerSubmitted = i;
        optionsContainer
          .querySelectorAll(".play-option-btn")
          .forEach((b) => (b.disabled = true));

        await updateDoc(
          doc(
            appState.db,
            "quizzes",
            appState.currentGamePin,
            "players",
            appState.currentUserId,
          ),
          {
            lastAnswerIndex: i,
            lastAnswerTime: serverTimestamp(),
          },
        );
      };
      optionsContainer.appendChild(button);
    });
  }

  appState.questionTimerInterval = setInterval(async () => {
    const elapsed = new Date() - questionStartTime;
    let remaining = questionDuration - elapsed;
    if (remaining < 0) remaining = 0;
    const secondsLeft = Math.ceil(remaining / 1000);

    if (isHost) {
      const answeredCount = appState.currentPlayersList.filter(
        (p) => p.lastAnswerIndex !== null && p.lastAnswerIndex !== undefined,
      ).length;
      const totalPlayers = appState.currentPlayersList.length;

      if ($("host-response-tracker"))
        $("host-response-tracker").textContent =
          `Responses Submitted: ${answeredCount} / ${totalPlayers}`;
      if ($("host-timer-bar"))
        $("host-timer-bar").style.width =
          (remaining / questionDuration) * 100 + "%";

      const hostClock = $("host-digital-timer");
      if (hostClock) {
        hostClock.textContent = secondsLeft;
        if (secondsLeft <= 5) hostClock.classList.add("timer-danger-pulse");
        else hostClock.classList.remove("timer-danger-pulse");
      }

      if (totalPlayers > 0 && answeredCount === totalPlayers) remaining = 0;
    } else {
      $("question-timer-bar").style.width =
        (remaining / questionDuration) * 100 + "%";

      const playerClock = $("play-digital-timer");
      if (playerClock) {
        playerClock.textContent = secondsLeft;
        if (secondsLeft <= 5) playerClock.classList.add("timer-danger-pulse");
        else playerClock.classList.remove("timer-danger-pulse");
      }
    }

    if (remaining <= 0) {
      clearInterval(appState.questionTimerInterval);
      if (isHost) {
        await handleHostTimerExpiration();
      } else {
        const optsContainer = $("play-quiz-options");
        if (optsContainer) {
          optsContainer
            .querySelectorAll(".play-option-btn")
            .forEach((b) => (b.disabled = true));
        }
        $("play-message").textContent = "⏰ Time's Up! Evaluating responses...";
      }
    }
  }, 100);
}

async function handleHostTimerExpiration() {
  const q =
    appState.currentQuizData.questions[appState.currentQuestionInPlayIndex];
  const questionStartTime =
    appState.currentQuizData.gameState.questionStartTime.toDate();
  const questionDuration = (q.timer || 20) * 1000;
  const playersSnapshot = await getDocs(
    collection(appState.db, "quizzes", appState.currentGamePin, "players"),
  );

  for (const pDoc of playersSnapshot.docs) {
    const pData = pDoc.data();
    let scoreToAdd = 0;
    let isCorrect = false;

    if (
      pData.lastAnswerIndex != null &&
      pData.lastAnswerIndex === q.correctAnswerIndex
    ) {
      const aTime = pData.lastAnswerTime
        ? pData.lastAnswerTime.toDate()
        : new Date();
      const timeTaken = aTime - questionStartTime;
      isCorrect = true;

      if (timeTaken < questionDuration && timeTaken > 0) {
        const speedRatio = (questionDuration - timeTaken) / questionDuration;
        const speedBonusPoints = 500 * speedRatio;
        scoreToAdd = Math.round(500 + speedBonusPoints);
      } else {
        scoreToAdd = 500;
      }
    }

    await updateDoc(pDoc.ref, {
      score: increment(scoreToAdd),
      lastAnswerIndex: null,
      lastAnswerTime: null,
      answers: arrayUnion({
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        submittedAnswerIndex: pData.lastAnswerIndex,
        isCorrect: isCorrect,
        scoreGained: scoreToAdd,
      }),
    });
  }
  await updateDoc(doc(appState.db, "quizzes", appState.currentGamePin), {
    "gameState.status": "leaderboard",
  });
}

function showPlayerAnswerScreen() {
  $("play-area").style.display = "none";
  $("leaderboard-area").style.display = "none";
  $("score-area").style.display = "none";
  $("player-answer-screen").style.display = "block";
  const myData = appState.currentPlayersList.find(
    (p) => p.id === appState.currentUserId,
  );
  if (!myData || !appState.currentQuizData) return;
  const q =
    appState.currentQuizData.questions[appState.currentQuestionInPlayIndex];
  const newScore = myData.score;
  const scoreGained = newScore - appState.lastKnownScore;
  appState.lastKnownScore = newScore;
  const isCorrect = appState.lastAnswerSubmitted === q.correctAnswerIndex;
  const icon = $("player-answer-icon"),
    title = $("player-answer-title"),
    points = $("player-answer-points"),
    correctText = $("player-answer-correct-text"),
    rankInfo = $("player-answer-rank-info");
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
    appState.currentPlayersList.findIndex(
      (p) => p.id === appState.currentUserId,
    ) + 1;
  if (myRank > 0) {
    rankInfo.textContent = `You are in ${myRank}${myRank === 1 ? "st" : myRank === 2 ? "nd" : myRank === 3 ? "rd" : "th"} place!`;
    if (myRank > 1) {
      const diff = appState.currentPlayersList[myRank - 2].score - newScore;
      if (diff > 0)
        rankInfo.textContent += ` You are ${diff} points behind ${appState.currentPlayersList[myRank - 2].name}.`;
    }
  }
}

function renderLeaderboardUI(players, containerId, isHost, isFinal = false) {
  const container = $(containerId);
  if (!container) return;
  const listEl = container.querySelector(".leaderboard-rest"),
    top3Container = container.querySelector(".leaderboard-top3");

  if (containerId === "leaderboard-area") {
    const status = appState.currentQuizData?.gameState.status;
    if (status === "question") return;
    if (status === "leaderboard" && top3Container) {
      top3Container.style.display = "flex";
      if ($("leaderboard-list")) $("leaderboard-list").innerHTML = "";
    }
  }

  if (listEl) listEl.innerHTML = "";
  const p1 = top3Container?.querySelector(".place-1"),
    p2 = top3Container?.querySelector(".place-2"),
    p3 = top3Container?.querySelector(".place-3");
  if (p1) p1.innerHTML = "";
  if (p2) p2.innerHTML = "";
  if (p3) p3.innerHTML = "";

  if (players.length > 0 && p1)
    p1.innerHTML = `<div class="leaderboard-avatar-box rank-pop-1"><img src="${players[0].avatarUrl || appState.avatars[0]}" class="leaderboard-avatar"><span class="leaderboard-rank-badge crown">🏆</span></div><span class="leaderboard-name">${players[0].name}</span><span class="leaderboard-score">${players[0].score} pts</span>`;
  if (players.length > 1 && p2)
    p2.innerHTML = `<div class="leaderboard-avatar-box rank-pop-2"><img src="${players[1].avatarUrl || appState.avatars[0]}" class="leaderboard-avatar"><span class="leaderboard-rank-badge">🥈</span></div><span class="leaderboard-name">${players[1].name}</span><span class="leaderboard-score">${players[1].score} pts</span>`;
  if (players.length > 2 && p3)
    p3.innerHTML = `<div class="leaderboard-avatar-box rank-pop-3"><img src="${players[2].avatarUrl || appState.avatars[0]}" class="leaderboard-avatar"><span class="leaderboard-rank-badge">🥉</span></div><span class="leaderboard-name">${players[2].name}</span><span class="leaderboard-score">${players[2].score} pts</span>`;

  if (listEl) {
    players.slice(3, 5).forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "leaderboard-item-rest animated-row";
      li.innerHTML = `<span class="leaderboard-rank">#${i + 4}</span><img src="${p.avatarUrl || appState.avatars[0]}" class="leaderboard-avatar" /><span class="leaderboard-name">${p.name}</span><span class="leaderboard-score">${p.score} pts</span>`;
      listEl.appendChild(li);
    });
  }

  if (containerId === "leaderboard-area" && isHost) {
    const nextBtn = $("host-next-btn");
    if (nextBtn) {
      const isLastQuestion =
        appState.currentQuestionInPlayIndex ===
        appState.currentQuizData.questions.length - 1;
      nextBtn.style.display =
        appState.currentQuizData?.gameState.status === "leaderboard"
          ? "block"
          : "none";
      nextBtn.textContent = isLastQuestion
        ? "Go to Winner Screen 🏆"
        : "Next Question ➔";
    }
  }
}

async function calculateAndShowScore(players, isHost) {
  $("play-area").style.display = "none";
  $("leaderboard-area").style.display = "none";
  $("player-answer-screen").style.display = "none";
  $("score-area").style.display = "block";

  const myData = players.find((p) => p.id === appState.currentUserId);
  $("quiz-score-display").textContent = myData
    ? `${myData.score} pts`
    : "0 pts";

  renderLeaderboardUI(players, "score-area", isHost, true);
  triggerConfettiExplosion();

  if (isHost && appState.currentQuizData) {
    try {
      const totalScoreSum = players.reduce((sum, p) => sum + p.score, 0);
      const averageScoreValue =
        players.length > 0 ? Math.round(totalScoreSum / players.length) : 0;

      const historicalLogSummary = {
        quizPin: appState.currentGamePin,
        quizName: appState.currentQuizData.quizName || "Unnamed Quiz",
        date: new Date().toLocaleDateString(),
        timestamp: serverTimestamp(),
        winnerName: players[0] ? players[0].name : "No Participants",
        participantCount: players.length,
        averageScore: averageScoreValue,
        creatorId: appState.currentUserId,
      };

      await addDoc(
        collection(appState.db, "quizHistory"),
        historicalLogSummary,
      );
    } catch (historyErr) {
      console.error("Historical ledger logging write error:", historyErr);
    }
  }

  try {
    if (players[0])
      await updateDoc(doc(appState.db, "users", players[0].id), {
        "ranks.first": increment(1),
      });
    if (players[1])
      await updateDoc(doc(appState.db, "users", players[1].id), {
        "ranks.second": increment(1),
      });
    if (players[2])
      await updateDoc(doc(appState.db, "users", players[2].id), {
        "ranks.third": increment(1),
      });
  } catch (err) {
    console.error(err);
  }

  if (appState.gameUnsubscribe) appState.gameUnsubscribe();
  if (appState.playerUnsubscribe) appState.playerUnsubscribe();
  appState.currentGamePin = null;
  appState.currentQuizData = null;
  appState.currentPlayersList = [];
}

function grandfatherLeaderboardReset() {
  let listEl = $("leaderboard-list");
  if (!listEl) {
    listEl = document.createElement("ul");
    listEl.id = "leaderboard-list";
    listEl.className = "leaderboard-rest";
    $("leaderboard-area").appendChild(listEl);
  }
  return listEl;
}

function triggerConfettiExplosion() {
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti-particle";
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.backgroundColor = [
      "#ff006e",
      "#FFD93D",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
    ][Math.floor(Math.random() * 5)];
    confetti.style.animationDelay = Math.random() * 2 + "s";
    confetti.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
}

export async function loadHostReport(pin) {
  const quizSnap = await getDoc(doc(appState.db, "quizzes", pin));
  if (!quizSnap.exists()) return;
  const quizData = quizSnap.data();
  if (quizData.gameState.status !== "finished") {
    appState.currentGamePin = pin;
    $("lobby-pin-display").textContent = pin;
    listenToGameUpdates(pin, true);
    showView("game-lobby-view");
    return;
  }
  $("host-report-title").textContent = `Report: ${quizData.quizName}`;
  const list = $("host-report-participants");
  list.innerHTML = "";
  const pSnap = await getDocs(
    collection(appState.db, "quizzes", pin, "players"),
  );
  pSnap.docs.forEach((pDoc) => {
    const pData = pDoc.data();
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = `${pData.name} (Score: ${pData.score})`;
    btn.onclick = () => loadGameReport(pin, pDoc.id, pData.name);
    list.appendChild(btn);
  });
  showView("host-report-selection-view");
}

export async function loadGameReport(pin, playerId, playerName = "Your") {
  const [qSnap, pSnap] = await Promise.all([
    getDoc(doc(appState.db, "quizzes", pin)),
    getDoc(doc(appState.db, "quizzes", pin, "players", playerId)),
  ]);
  if (!qSnap.exists() || !pSnap.exists()) return;
  const qData = qSnap.data(),
    pData = pSnap.data();
  $("game-report-title").textContent = `${qData.quizName}`;
  $("game-report-subtitle").textContent =
    `${playerName}'s Report - Final Score: ${pData.score}`;
  const container = $("game-report-items");
  container.innerHTML = pData.answers?.length
    ? ""
    : "<p>No metric answer recording logged.</p>";
  pData.answers?.forEach((ans, idx) => {
    const item = document.createElement("div");
    item.className = "report-item";
    let opts = "";
    ans.options.forEach((opt, oIdx) => {
      let cn =
        "report-option" +
        (oIdx === ans.correctAnswerIndex ? " correct" : "") +
        (oIdx === ans.submittedAnswerIndex ? " submitted" : "");
      opts += `<span class="${cn}">${opt.text}</span>`;
    });
    item.innerHTML = `<h4>Q${idx + 1}: ${ans.question}</h4>${opts}`;
    container.appendChild(item);
  });
  showView("game-report-view");
}

function displayImageOnCard(url) {
  const targetImg = document.getElementById("question-image-preview");
  if (targetImg) {
    targetImg.src = url;
    targetImg.style.display = "block";
  }
}
