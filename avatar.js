export const avatars = [
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Mimi',
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Leo',
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Cleo',
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Max',
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Luna',
            'https://api.dicebear.com/8.x/adventurer/svg?seed=Rocky'
        ];
        
        
        async function selectAvatar(url) {
  if (!currentUserId) return;
  await updateDoc(doc(db, "users", currentUserId), { avatarUrl: url });
  if (currentUserData) currentUserData.avatarUrl = url;
  $("profile-avatar-img").src = url;
  showView("profile-view");
}
$("hamburger-btn").addEventListener("click", () =>
  $("nav-dropdown").classList.toggle("open"),
);
$("home-nav-btn").addEventListener("click", () => showView("home-view"));
$("profile-nav-btn").addEventListener("click", () => showView("profile-view"));
$("logout-btn").addEventListener("click", () => {
  if (gameUnsubscribe) gameUnsubscribe();
  if (playerUnsubscribe) playerUnsubscribe();
  signOut(auth);
});
$("edit-avatar-btn").addEventListener("click", () => showView("avatar-view"));
$("back-to-profile-btn").addEventListener("click", () =>
  showView("profile-view"),
);
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
    currentUserId
  ) {
    await updateDoc(doc(db, "users", currentUserId), { name: newName });
    if (currentUserData) currentUserData.name = newName;
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

$("generate-pin-btn").addEventListener("click", async () => {
  const finalizeMessage = $("finalize-message");
  finalizeMessage.textContent = "";

  const quizName = $("quiz-name-input").value.trim();
  if (!quizName) {
    finalizeMessage.style.color = "var(--incorrect-red)";
    finalizeMessage.textContent = "Please enter a name for your quiz.";
    return;
  }

  if (!currentUserId) {
    finalizeMessage.textContent = "Error: You must be logged in.";
    return;
  }
  try {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const quizDocRef = doc(db, "quizzes", pin);
    const docSnap = await getDoc(quizDocRef);
    if (docSnap.exists()) {
      finalizeMessage.textContent = "PIN conflict, please try again.";
      return;
    }

    await setDoc(quizDocRef, {
      creatorId: currentUserId,
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
    await updateDoc(doc(db, "users", currentUserId), {
      createdGames: arrayUnion(newGameEntry),
    });
    if (currentUserData) {
      if (!currentUserData.createdGames) currentUserData.createdGames = [];
      currentUserData.createdGames.push(newGameEntry);
    }

    currentGamePin = pin;
    $("lobby-pin-display").textContent = pin;
    listenToGameUpdates(pin, true);
    showView("game-lobby-view");
  } catch (error) {
    console.error("Error generating PIN:", error);
    finalizeMessage.textContent = "Could not create game: " + error.message;
  }
});
