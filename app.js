import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initAuth } from "./auth.js";
import { initProfile, populateProfileData } from "./profile.js";
import { initAvatar, populateAvatarGrid } from "./avatar.js";
import { initQuiz } from "./quiz.js";
import { initFeedback } from "./feedback.js";

const firebaseConfig = {
  apiKey: "AIzaSyDnFRyh6x3wBf28RGU3zdCT7D56NXL15vw",
  authDomain: "login-portal-demo.firebaseapp.com",
  projectId: "login-portal-demo",
  storageBucket: "login-portal-demo.firebasestorage.app",
  messagingSenderId: "618860633719",
  appId: "1:618860633719:web:d7b22157f4b546782b7072",
  measurementId: "G-BGNGZ63HF0",
};

// Global Context Reference Registry
export const appState = {
  db: null,
  auth: null,
  currentUserId: null,
  currentUserData: null,
  currentGamePin: null,
  currentQuizData: null,
  currentPlayersList: [],
  currentQuestionInPlayIndex: 0,
  lastKnownScore: 0,
  lastAnswerSubmitted: null,
  gameUnsubscribe: null,
  playerUnsubscribe: null,
  questionTimerInterval: null,
  avatars: [
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Mimi",
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Leo",
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Cleo",
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Max",
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Luna",
    "https://api.dicebear.com/8.x/adventurer/svg?seed=Rocky",
  ],
};

export const $ = (id) => document.getElementById(id);

export function showView(viewName) {
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
  else if (
    viewName === "avatar-view" &&
    $("avatar-grid").childElementCount === 0
  )
    populateAvatarGrid();
  if ($("nav-dropdown")) $("nav-dropdown").classList.remove("open");
}

function resetBodyBackground() {
  document.body.style.backgroundColor = "var(--bg-color)";
  document.body.style.backgroundImage = "none";
  if ($("sticker-canvas")) $("sticker-canvas").innerHTML = "";
}

// Global Core Infrastructure Bootsheet
document.addEventListener("DOMContentLoaded", () => {
  const firebaseApp = initializeApp(firebaseConfig);
  appState.auth = getAuth(firebaseApp);
  appState.db = getFirestore(firebaseApp);

  // Context Cross-Wiring Handshakes
  initAuth();
  initProfile();
  initAvatar();
  initQuiz();
  initFeedback();

  // Responsive Platform Adaptive Controls
  if (
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  ) {
    document
      .querySelectorAll(".share-btn")
      .forEach((btn) => (btn.style.display = "none"));
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      if (btn.parentElement.classList.contains("button-group")) {
        btn.style.width = "100%";
        btn.style.flex = "unset";
      }
    });
  }

  // Navigation Base Interceptors
  $("hamburger-btn").addEventListener("click", () =>
    $("nav-dropdown").classList.toggle("open"),
  );
  $("home-nav-btn").addEventListener("click", () => showView("home-view"));
  $("profile-nav-btn").addEventListener("click", () =>
    showView("profile-view"),
  );
  $("logout-btn").addEventListener("click", () => {
    if (appState.gameUnsubscribe) appState.gameUnsubscribe();
    if (appState.playerUnsubscribe) appState.playerUnsubscribe();
    appState.auth.signOut();
  });
});
