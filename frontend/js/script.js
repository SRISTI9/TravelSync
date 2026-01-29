function scrollToTrips() {
  document.getElementById("upcoming-trips").scrollIntoView({ behavior: "smooth" });
}

function renderTrips(trips, containerId) {
  const container = document.getElementById(containerId);
  trips.forEach(trip => {
    const card = document.createElement("div");
    card.className = "trip-card";
    card.innerHTML = `
      <img src="${trip.img}">
      <h3>${trip.name}</h3>
      <button onclick="viewTrip('${trip.id}')">Explore Trip</button>
    `;
    container.appendChild(card);
  });
}

function viewTrip(id) {
  if (localStorage.getItem("loggedIn") !== "true") {
    alert("Please login to view trip details");
    window.location.href = "login.html";
    return;
  }
  window.location.href = `trip-details.html?trip=${id}`;
}

renderTrips(domesticTrips, "domesticTrips");
renderTrips(internationalTrips, "internationalTrips");
