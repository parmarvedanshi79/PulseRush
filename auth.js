async function mainAuth() {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setLogLevel("Debug");
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId = user.uid;
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        currentUserData = userDocSnap.data();
        if (!currentUserData.ranks) {
          currentUserData.ranks = { first: 0, second: 0, third: 0 };
          await updateDoc(userDocRef, { ranks: currentUserData.ranks });
        }
      } else {
        currentUserData = {
          name: "Player",
          username: "player" + Date.now(),
          email: user.email || "",
          avatarUrl: avatars[0],
          createdGames: [],
          joinedGames: [],
          ranks: { first: 0, second: 0, third: 0 },
        };
        try {
          await setDoc(userDocRef, currentUserData);
        } catch (e) {
          console.warn("Could not create user doc on login:", e.message);
        }
      }
      $("auth-page-container").style.display = "none";
      $("app-page-container").style.display = "block";
      showView("home-view");
    } else {
      currentUserId = null;
      currentUserData = null;
      $("auth-page-container").style.display = "flex";
      $("app-page-container").style.display = "none";
      if (gameUnsubscribe) gameUnsubscribe();
      if (playerUnsubscribe) playerUnsubscribe();
    }
  });
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    const btn = e.target.querySelector(".btn");
    btn.disabled = true;
    messageLabel.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      messageLabel.style.color = "red";
      messageLabel.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector(".btn");
    const name = $("signup-name").value.trim();
    const email = $("signup-email").value.trim();
    const username = $("signup-username").value.trim().toLowerCase();
    const password = $("signup-password").value;
    if (!name || !email || !username || !password) {
      messageLabel.style.color = "red";
      messageLabel.textContent = "All fields are required!";
      return;
    }
    btn.disabled = true;
    messageLabel.textContent = "";
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        username,
        email,
        avatarUrl: avatars[0],
        createdGames: [],
        joinedGames: [],
        ranks: { first: 0, second: 0, third: 0 },
      });
    } catch (error) {
      messageLabel.style.color = "red";
      console.error("Signup Error:", error);
      messageLabel.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("forgot-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("reset-email").value.trim();
    const btn = e.target.querySelector(".btn");
    btn.disabled = true;
    resetMessageLabel.textContent = "";
    try {
      await sendPasswordResetEmail(auth, email);
      resetMessageLabel.style.color = "green";
      resetMessageLabel.textContent =
        "Success! Check your email for a reset link.";
    } catch (error) {
      resetMessageLabel.style.color = "red";
      resetMessageLabel.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("login-tab-btn").addEventListener("click", () => {
    $("login").classList.add("active");
    $("signup").classList.remove("active");
    $("login-tab-btn").classList.add("active");
    $("signup-tab-btn").classList.remove("active");
  });
  $("signup-tab-btn").addEventListener("click", () => {
    $("login").classList.remove("active");
    $("signup").classList.add("active");
    $("login-tab-btn").classList.remove("active");
    $("signup-tab-btn").classList.add("active");
  });
  $("forgot-password-link").addEventListener("click", () => {
    $("auth-views").style.display = "none";
    $("forgot-password-view").style.display = "block";
  });
  $("back-to-login-link").addEventListener("click", () => {
    $("auth-views").style.display = "block";
    $("forgot-password-view").style.display = "none";
  });
}
 mainAuth();