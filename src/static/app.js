document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Inject small stylesheet for pretty activity cards / participants list
  (function ensureActivityCardStyles() {
    if (document.getElementById("activity-card-styles")) return;
    const css = `
      .activity-card {
        border: 1px solid #e6eaf0;
        background: linear-gradient(180deg,#ffffff,#fbfdff);
        padding: 12px 14px;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(33,47,60,0.06);
        margin-bottom: 12px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      }
      .activity-card h4 { margin: 0 0 6px 0; font-size: 1.05rem; color: #102027; }
      .activity-card p { margin: 4px 0; color: #374151; font-size: 0.95rem; }
      .participants { margin-top: 8px; }
      .participants strong { display:block; margin-bottom:6px; color:#0f172a; }
      /* Hide default bullets and reset spacing so we can style list items cleanly */
      .participants-list { list-style: none; margin: 0; padding: 0; color:#263238; }
      .participants-list li { margin: 6px 0; font-size:0.92rem; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .participants-empty { color: #6b7280; font-style: italic; font-size:0.9rem; }
      .availability { font-weight:600; color:#0b74de; }
      .delete-btn { background: transparent; border: 0; color: #ef4444; cursor: pointer; font-size: 0.95rem; padding: 4px 6px; border-radius:4px; }
      .delete-btn:hover { background: rgba(239,68,68,0.08); }
    `;
    const style = document.createElement("style");
    style.id = "activity-card-styles";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  })();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options (keep placeholder)
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup (no bullets). Add delete button next to each participant.
        const participantsHtml = (details.participants && details.participants.length > 0)
          ? `<ul class="participants-list">${details.participants.map(p => `<li data-email="${p}"><span class="participant-email">${p}</span><button class="delete-btn" data-activity="${name}" data-email="${p}" title="Unregister">✖</button></li>`).join("")}</ul>`
          : `<div class="participants-empty">No participants yet — be the first!</div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for the participant buttons inside this card
        const deleteButtons = activityCard.querySelectorAll(".delete-btn");
        deleteButtons.forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const activityName = btn.getAttribute("data-activity");
            const email = btn.getAttribute("data-email");

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
              const resJson = await resp.json();
              if (resp.ok) {
                // Refresh activities list to update participants and availability
                fetchActivities();
              } else {
                console.error("Failed to unregister:", resJson);
                alert(resJson.detail || "Failed to remove participant");
              }
            } catch (err) {
              console.error("Error removing participant:", err);
              alert("Failed to remove participant. Please try again.");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so the new participant shows immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
