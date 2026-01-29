const params = new URLSearchParams(window.location.search);
const tripKey = params.get("trip");

const trip = trips[tripKey];

document.getElementById("heroImage").src = trip.heroImage;
document.getElementById("tripTitle").innerText = trip.title;
document.getElementById("tripRoute").innerText = trip.route;
document.getElementById("tripAbout").innerText = trip.about;

const infoDiv = document.getElementById("tripInfo");
Object.entries(trip.info).forEach(([key, value]) => {
  infoDiv.innerHTML += `
    <div class="info-box">
      <h3>${key}</h3>
      <p>${value}</p>
    </div>`;
});

const expDiv = document.getElementById("experiences");
trip.experiences.forEach(exp => {
  expDiv.innerHTML += `
    <div class="experience-card">
      <img src="${exp.img}">
      <p>${exp.title}</p>
    </div>`;
});

const planDiv = document.getElementById("plan");
Object.entries(trip.plan).forEach(([day, text]) => {
  planDiv.innerHTML += `<p><strong>${day.toUpperCase()}</strong> – ${text}</p>`;
});
