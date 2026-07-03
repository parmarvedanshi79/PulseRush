$("feedback-nav-btn").addEventListener("click", () => {
  $("feedback-form-content").style.display = "block";
  $("feedback-thanks-content").style.display = "none";
  $("feedback-text").value = "";
  $("feedback-message").textContent = "";
  currentRating = 0;
  updateStars(0);
  $("feedback-modal").style.display = "flex";
});

$("cancel-feedback-btn").addEventListener("click", () => {
  $("feedback-modal").style.display = "none";
});

$("close-thanks-btn").addEventListener("click", () => {
  $("feedback-modal").style.display = "none";
});

$("feedback-stars").addEventListener("click", (e) => {
  if (e.target.classList.contains("star")) {
    currentRating = parseInt(e.target.dataset.value);
    updateStars(currentRating);
  }
});

$("feedback-stars").addEventListener("mouseover", (e) => {
  if (e.target.classList.contains("star")) {
    updateStars(parseInt(e.target.dataset.value));
  }
});

$("feedback-stars").addEventListener("mouseout", () => {
  updateStars(currentRating);
});

function updateStars(rating) {
  const stars = document.querySelectorAll("#feedback-stars .star");
  stars.forEach((star) => {
    if (parseInt(star.dataset.value) <= rating) {
      star.classList.add("selected");
      star.textContent = "★";
    } else {
      star.classList.remove("selected");
      star.textContent = "☆";
    }
  });
}

$("submit-feedback-btn").addEventListener("click", async () => {
  const feedbackText = $("feedback-text").value.trim();
  const message = $("feedback-message");
  message.textContent = "";

  if (currentRating === 0) {
    message.style.color = "var(--incorrect-red)";
    message.textContent = "Please select a star rating.";
    return;
  }

  const feedback = {
    rating: currentRating,
    review: feedbackText,
    userId: currentUserId,
    username: currentUserData.name || "Anonymous",
    timestamp: serverTimestamp(),
  };

  const btn = $("submit-feedback-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    await addDoc(collection(db, "feedback"), feedback);
    $("feedback-form-content").style.display = "none";
    $("feedback-thanks-content").style.display = "block";
  } catch (error) {
    console.error("Error submitting feedback:", error);
    message.style.color = "var(--incorrect-red)";
    message.textContent = "Could not submit feedback. " + error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit";
  }
});

const stickers = ["⭐", "❤️", "💡", "❓", "🎯", "🎉", "💯", "✔️"];
