const weatherList = document.getElementById("weatherList");
const statusEl = document.getElementById("status");
const cityInput = document.getElementById("cityInput");
const suggestions = document.getElementById("suggestions");
const cityError = document.getElementById("cityError");
const addCityBtn = document.getElementById("addCityBtn");
const addCitySection = document.getElementById("addCitySection");
const refreshBtn = document.getElementById("refreshBtn");

let locations = JSON.parse(localStorage.getItem("locations")) || [];
let selectedCity = null;

init();


function init() {
    addCitySection.classList.remove("hidden");

    const hasCurrentLocation = locations.some(loc => loc.isCurrent);

    if (!hasCurrentLocation) {
        requestGeolocation();
    } else {
        loadWeather();
    }
}



// geolocation

function requestGeolocation() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const exists = locations.some(
                loc => loc.isCurrent
            );
            if (!exists) {
                locations.unshift({
                    name: "Текущее местоположение",
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    isCurrent: true 
                });
                saveAndLoad();
            } else {
                loadWeather();
            }
        },
        () => {
            addCitySection.classList.remove("hidden");
        }
    );
}





// loading weather

function loadWeather() {
    weatherList.innerHTML = "";
    statusEl.textContent = "Загрузка данных...";

    Promise.all(
        locations.map(loc =>
            fetchWeather(loc).then(data => ({ loc, data }))
        )
    )
    .then(results => {
        results.forEach(item => {
            renderWeather(item.loc.name, item.data);
        });
        statusEl.textContent = "";
    })
    .catch(() => {
        statusEl.textContent = "Ошибка загрузки погоды";
    });
}

function fetchWeather(loc) {
    const url = `
https://api.open-meteo.com/v1/forecast
?latitude=${loc.lat}
&longitude=${loc.lon}
&daily=temperature_2m_max,temperature_2m_min
&timezone=auto
`;

    return fetch(url).then(r => r.json());
}


function loadWeatherForLocation(loc) {
    const url = `
https://api.open-meteo.com/v1/forecast
?latitude=${loc.lat}
&longitude=${loc.lon}
&daily=temperature_2m_max,temperature_2m_min
&timezone=auto
`;

    return fetch(url)
        .then(r => r.json())
        .then(data => renderWeather(loc.name, data));
}

function renderWeather(name, data) {
    const card = document.createElement("div");
    card.className = "weather-card";

    let html = `<h3>${name}</h3>`;
    for (let i = 0; i < 3; i++) {
        html += `
            <div class="day">
                <span>День ${i + 1}</span>
                <span>
                    ${data.daily.temperature_2m_min[i]}°C —
                    ${data.daily.temperature_2m_max[i]}°C
                </span>
            </div>
        `;
    }

    card.innerHTML = html;
    weatherList.appendChild(card);
}

// city search

cityInput.addEventListener("input", () => {
    suggestions.innerHTML = "";
    cityError.textContent = "";
    selectedCity = null;

    if (cityInput.value.length < 2) return;

    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityInput.value}`)
        .then(r => r.json())
        .then(data => {
            if (!data.results) return;

            data.results.slice(0, 5).forEach(city => {
                const div = document.createElement("div");
                div.textContent = `${city.name}, ${city.country}`;
                div.onclick = () => {
                    selectedCity = city;
                    cityInput.value = div.textContent;
                    suggestions.innerHTML = "";
                };
                suggestions.appendChild(div);
            });
        });
});

// add city

addCityBtn.onclick = () => {
    if (!selectedCity) {
        cityError.textContent = "Выберите город из списка";
        return;
    }

    const exists = locations.some(loc =>
        Math.abs(loc.lat - selectedCity.latitude) < 0.01 &&
        Math.abs(loc.lon - selectedCity.longitude) < 0.01
    );

    if (exists) {
        cityError.textContent = "Этот город уже добавлен";
        return;
    }

    locations.push({
        name: `${selectedCity.name}, ${selectedCity.country}`,
        lat: selectedCity.latitude,
        lon: selectedCity.longitude
    });

    cityInput.value = "";
    selectedCity = null;
    saveAndLoad();
};



function saveAndLoad() {
    localStorage.setItem("locations", JSON.stringify(locations));
    loadWeather();
}


refreshBtn.onclick = loadWeather;
