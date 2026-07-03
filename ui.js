function resetBodyBackground() {
  document.body.style.backgroundColor = "var(--bg-color)";
  document.body.style.backgroundImage = "none";
  if ($("sticker-canvas")) $("sticker-canvas").innerHTML = "";
}
function showView(viewName) {
  [
    "home-view",
    "profile-view",
    "avatar-view",
    "create-quiz-view",
    "finalize-quiz-view",
    "pin-view",
    "join-quiz-view",
    "play-quiz-view",
    "game-lobby-view",
    "template-choice-view",
    "player-waiting-lobby",
    "host-report-selection-view",
    "game-report-view",
  ].forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });
  if (viewName !== "create-quiz-view") resetBodyBackground();

  const view = $(viewName);

  if (viewName === "player-waiting-lobby") {
    $("main-content").style.display = "none";
  } else {
    $("main-content").style.display = "block";
  }
  if (view) view.classList.add("active");

  if (viewName === "profile-view") populateProfileData();
  else if (viewName === "create-quiz-view") {
    if (quizQuestions.length === 0) startNewQuiz();
    else renderCurrentQuestion();
  } else if (viewName === "finalize-quiz-view") renderFinalizeList();
  else if (
    viewName === "avatar-view" &&
    $("avatar-grid").childElementCount === 0
  )
    populateAvatarGrid();
  if ($("nav-dropdown")) $("nav-dropdown").classList.remove("open");
}

const $ = (id) => document.getElementById(id);

function shareToWhatsApp(pin) {
  const text = `Enter this Game PIN to join: ${pin}`;
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encodedText}`;
  window.open(url, "_blank");
}

if (
  !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
) {
  const shareButtons = document.querySelectorAll(".share-btn");
  shareButtons.forEach((btn) => (btn.style.display = "none"));
  const copyButtons = document.querySelectorAll(".copy-btn");
  copyButtons.forEach((btn) => {
    if (btn.parentElement.classList.contains("button-group")) {
      btn.style.width = "100%";
      btn.style.flex = "unset";
    }
  });
}
