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
$("lobby-copy-pin-btn").addEventListener("click", () => {
  const textToCopy = $("lobby-pin-display").textContent;
  const textArea = document.createElement("textarea");
  textArea.value = textToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    $("lobby-copy-pin-btn").textContent = "Copied!";
  } catch (err) {
    console.error("Failed to copy", err);
    $("lobby-copy-pin-btn").textContent = "Error";
  }
  document.body.removeChild(textArea);
  setTimeout(() => {
    $("lobby-copy-pin-btn").textContent = "Copy PIN";
  }, 2000);
});

$("lobby-share-btn").addEventListener("click", () => {
  const pin = $("lobby-pin-display").textContent;
  shareToWhatsApp(pin);
});

$("copy-pin-btn").addEventListener("click", () => {
  const textToCopy = $("game-pin-display").textContent;
  const textArea = document.createElement("textarea");
  textArea.value = textToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    $("copy-pin-btn").textContent = "Copied!";
  } catch (err) {
    console.error("Failed to copy", err);
    $("copy-pin-btn").textContent = "Error";
  }
  document.body.removeChild(textArea);
  setTimeout(() => {
    $("copy-pin-btn").textContent = "Copy PIN";
  }, 2000);
});

$("share-pin-btn").addEventListener("click", () => {
  const pin = $("game-pin-display").textContent;
  shareToWhatsApp(pin);
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
  if ($("sticker-grid").childElementCount === 0) {
    populateStickerGrid();
  }
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
  element.onmousedown = dragMouseDown;
  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
