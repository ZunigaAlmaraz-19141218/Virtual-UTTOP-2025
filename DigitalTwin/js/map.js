// ===========================
// ENIT Campus Navigation - MAP
// Handles Map, GPS, Routing, Steps Highlighting
// ===========================

// === Helper function ===
const $ = id => document.getElementById(id);
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}


// === Campus boundaries ===
const campusBounds = [
  [43.2235, 0.0459],
  [43.2280, 0.0536]
];

// === Campus polygon (for routing validation) ===
const campusPoly = turf.polygon([[
  [0.0459, 43.2235], [0.0536, 43.2235],
  [0.0536, 43.2280], [0.0459, 43.2280],
  [0.0459, 43.2235]
]]);
// === Fixed locations on campus ===
const locations = {
  Entrance: [43.225018, 0.052059],
  Library: [43.224945, 0.051151],
  Cafeteria: [43.227491, 0.050948],
  Gym: [43.225022, 0.050141],
  Building_a: [43.225121, 0.051905],
  Building_b: [43.225188, 0.051330],
  Building_c: [43.224918, 0.050762],
  Building_d: [43.224511, 0.051267],
  Building_e: [43.224897, 0.051205],
  Villa: [43.225722, 0.050753],
  Building_j: [43.226148, 0.050630],
  Building_k: [43.226481, 0.050634],
  Building_m: [43.223988, 0.050028],
  Building_iufm: [43.224808, 0.049464],
  Observatory_Midi_Pyrenees: [43.223953, 0.049200],
  Département_Génie_Électrique_et_InformatiqueIndustrielle: [43.225952, 0.048409],
  Département_Techniques_de_Commercialisation: [43.226238, 0.049283],
  Département_Génie_Mécanique_et_Productique: [43.226579, 0.047749],
  Département_Gestion_des_Entreprises_et_des_Administrations: [43.226727, 0.049311],
  Département_Métiers_du_Multimédia_et_de_lInternet: [43.227101, 0.049143],
  Département_Génie_Civil_Construction_Durable: [43.226198, 0.047592],
  Résidence_Universitaire_Simone_Veil: [43.227420, 0.050176],
  Résidence_Universitaire_A: [43.227188, 0.051380],
  Résidence_Universitaire_B: [43.226901, 0.051519],
  Résidence_Universitaire_C: [43.226672, 0.051519],
  Résidence_Universitaire_D: [43.227049, 0.050050],
  Résidence_Universitaire_E: [43.227233, 0.050063],
  Résidence_Universitaire_F: [43.227397, 0.050192],
  Laboratory_l0: [43.225374, 0.050196],
  Laboratory_l1: [43.225663, 0.050199],
  Laboratory_l2: [43.225945, 0.050215],
  Laboratory_l3: [43.226115, 0.050229],
  Laboratory_l4: [43.226295, 0.050246]
};

// === Populate origin and destination selects ===
function fill(id) {
  const sel = $(id);
  sel.innerHTML = `<option value="gps">My Location</option>`;

  const groups = {
    "General Facilities": ["Entrance", "Library", "Cafeteria", "Gym", "Villa"],
    "Academic Buildings": [
      "Building A", "Building B", "Building C", "Building D", "Building E",
      "Building J", "Building K", "Building M", "Building Iufm",
      "Observatory Midi Pyrenees"
    ],
    "Departments": [
      "Département_Génie_Électrique_et_InformatiqueIndustrielle",
      "Département_Techniques_de_Commercialisation",
      "Département_Génie_Mécanique_et_Productique",
      "Département_Gestion_des_Entreprises_et_des_Administrations",
      "Département_Métiers_du_Multimédia_et_de_lInternet",
      "Département_Génie_Civil_Construction_Durable",
      "Résidence_Universitaire_Simone_Veil"
    ],
    "Student Residences": [
      "Résidence_Universitaire_A", "Résidence_Universitaire_B", "Résidence_Universitaire_C",
      "Résidence_Universitaire_D", "Résidence_Universitaire_E", "Résidence_Universitaire_F"
    ],
    "Laboratories": ["Laboratory_l0", "Laboratory_l1", "Laboratory_l2", "Laboratory_l3", "Laboratory_l4"]
  };

  for (let label in groups) {
    let optgroup = document.createElement('optgroup');
    optgroup.label = label;

    groups[label].forEach(key => {
      let option = document.createElement('option');
      option.value = key;
      option.textContent = key.replace(/_/g, ' ');
      optgroup.appendChild(option);
    });

    sel.appendChild(optgroup);
  }
}

fill('origin');
fill('destination');

// === Initialize the map ===
const map2D = L.map('map2D', {
  center: [43.22476, 0.05044],
  zoom: 18,
  minZoom: 17,
  maxZoom: 19,
  maxBounds: campusBounds,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map2D);

// === Global variables ===
let marker2D, watchId, routingControl, instructions = [];
let smoothLat, smoothLon, first = true, frameCnt = 0;

// === Start GPS button handler ===
$('btnStartGPS').addEventListener('click', () => {
  if (!navigator.geolocation) {
    return showBanner('Geolocation is not supported.');
  }

  navigator.geolocation.getCurrentPosition(() => {}, () => showBanner('Please allow location access'), { timeout: 5000 });

  if (watchId) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(onPos, e => showBanner(e.message), {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
  });
});

// === GPS position update ===
function onPos({ coords: { latitude: lat, longitude: lon, accuracy, altitude: alt, heading } }) {
  if (accuracy > 100) return;

  if (first) {
    smoothLat = lat;
    smoothLon = lon;
    first = false;
  } else {
    const alpha = 0.4;
    smoothLat = smoothLat * (1 - alpha) + lat * alpha;
    smoothLon = smoothLon * (1 - alpha) + lon * alpha;
  }

  // Throttle update to ~15 fps
  if (++frameCnt % 3 !== 0) return;

  const position = [smoothLat, smoothLon];

  if (!marker2D) {
    marker2D = L.marker(position, {
      icon: L.divIcon({
        className: 'user-marker',
        html: '<div class="inner"></div><div class="arrow"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map2D);
  } else {
    marker2D.setLatLng(position);
  }

  if (heading != null) {
    marker2D.getElement().querySelector('.arrow')
      .style.transform = `translateX(-50%) rotate(${heading}deg)`;
  }

  map2D.setView(position, map2D.getZoom());

  // Update info panel
  let floor = 'Unknown';
  if (alt != null) {
    let d = alt - 312;
    floor = d < 2 ? 'Ground' : d < 4 ? 'First' : 'Upper';
  }

  $('info').innerHTML = `
    Lat: ${smoothLat.toFixed(6)}<br>
    Lon: ${smoothLon.toFixed(6)}<br>
    Alt: ${alt != null ? alt.toFixed(1) + ' m' : '—'}<br>
    Acc: ±${accuracy.toFixed(1)} m<br>
    Floor: ${floor}
  `;

  if (instructions.length) requestAnimationFrame(highlightStep);
}

// === Search box filter logic ===
$('searchBox').addEventListener('input', debounce(() => {
  const text = $('searchBox').value.toLowerCase();

  ['origin', 'destination'].forEach(id => {
    Array.from($(id).options).forEach(option => {
      option.style.display = option.text.toLowerCase().includes(text) ? 'block' : 'none';
    });
  });
}, 100));

// === Route drawing and save instructions ===
$('btnGo').addEventListener('click', () => {
  const originKey = $('origin').value;
  const destinationKey = $('destination').value;

  if (!destinationKey) return showBanner('Please select a destination.');

  const originLatLng = originKey === 'gps' && marker2D ? marker2D.getLatLng() : L.latLng(...locations[originKey]);
  if (!originLatLng) return showBanner('Please start GPS or select an origin.');

  const destinationLatLng = L.latLng(...locations[destinationKey]);

  if (routingControl) map2D.removeControl(routingControl);

  routingControl = L.Routing.control({
    router: L.Routing.osrmv1({
      serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
      profile: 'foot'
    }),
    waypoints: [originLatLng, destinationLatLng],
    fitSelectedRoutes: true,
    show: false,
    routeWhileDragging: false,
    addWaypoints: false,
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#0055A4', weight: 5 }] }
  })
  .on('routesfound', e => {
    const route = e.routes[0];

    if (route.coordinates.some(c =>
      !turf.booleanPointInPolygon(turf.point([c.lng, c.lat]), campusPoly)
    )) {
      return showBanner('Route leaves campus bounds.');
    }

    instructions = route.instructions;

    $('stepsHeader').textContent = `Steps`;
    $('stepsList').innerHTML = instructions.map((instruction, index) =>
      `<li id="step-${index}">${instruction.text}</li>`
    ).join('');
  })
  .on('routingerror', () => showBanner('Routing error occurred.'))
  .addTo(map2D);
});

// === Highlight nearest routing step ===
function highlightStep() {
  if (!marker2D) return;

  const pos = marker2D.getLatLng();
  const point = turf.point([pos.lng, pos.lat]);

  let bestIndex = 0;
  let bestDistance = Infinity;

  instructions.forEach((instruction, index) => {
    if (!instruction.latLng) return;

    const distance = turf.distance(point, turf.point([instruction.latLng.lng, instruction.latLng.lat]), { units: 'meters' });

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  document.querySelectorAll('#stepsList li').forEach(li => li.classList.remove('current'));
  const currentStepEl = $('step-' + bestIndex);
  if (currentStepEl) currentStepEl.classList.add('current');

  $('stepsHeader').textContent = `Steps (${bestIndex + 1}/${instructions.length})`;
}

function navigateToMarker(lat, lon) {
  const destinationLatLng = L.latLng(lat, lon);

  const originKey = $('origin').value;

  let originLatLng;

  if (originKey === 'gps') {
    if (marker2D) {
      originLatLng = marker2D.getLatLng();
    } else {
      showBanner('Please start GPS first.');
      return; // Exit early
    }
  } else {
    originLatLng = L.latLng(...locations[originKey]);
  }

  if (routingControl) map2D.removeControl(routingControl);

  routingControl = L.Routing.control({
    router: L.Routing.osrmv1({
      serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
      profile: 'foot'
    }),
    waypoints: [originLatLng, destinationLatLng],
    fitSelectedRoutes: true,
    show: false,
    routeWhileDragging: false,
    addWaypoints: false,
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#0055A4', weight: 5 }] }
  })
  .on('routesfound', e => {
    const route = e.routes[0];

    if (route.coordinates.some(c =>
      !turf.booleanPointInPolygon(turf.point([c.lng, c.lat]), campusPoly)
    )) {
      return showBanner('Route leaves campus bounds.');
    }

    instructions = route.instructions;

    $('stepsHeader').textContent = `Steps`;
    $('stepsList').innerHTML = instructions.map((instruction, index) =>
      `<li id="step-${index}">${instruction.text}</li>`
    ).join('');
  })
  .on('routingerror', () => showBanner('Routing error occurred.'))
  .addTo(map2D);

  showBanner('Routing to selected marker...');
}


function checkAndSaveUrlMarker() {
  const urlParams = new URLSearchParams(window.location.search);

  const paramLat = parseFloat(urlParams.get('lat'));
  const paramLon = parseFloat(urlParams.get('lon'));

  if (!isNaN(paramLat) && !isNaN(paramLon)) {
    const position = L.latLng(paramLat, paramLon);

    // Center map
    map2D.setView(position, map2D.getZoom());
    console.log(`Map centered to URL position: ${paramLat}, ${paramLon}`);

    // BEFORE saving: check if an existing Location Link already exists
    const tx = db.transaction("infos", "readonly");
    const store = tx.objectStore("infos");

    const infos = [];
    store.openCursor().onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        infos.push(cursor.value);
        cursor.continue();
      } else {
        const existing = infos.find(info =>
          info.comment === "Location Link" &&
          Math.abs(info.lat - position.lat) < 0.00001 &&
          Math.abs(info.lon - position.lon) < 0.00001
        );

        if (existing) {
          console.log("Location Link already exists → will not add duplicate.");
        } else {
          const tx2 = db.transaction("infos", "readwrite");
          const store2 = tx2.objectStore("infos");

          const infoObject = {
            lat: position.lat,
            lon: position.lng,
            comment: "Location from URL_Link",
            image: null,
            markerType: "LocationLink",
            timestamp: Date.now()
          };

          const addRequest = store2.add(infoObject);

          addRequest.onsuccess = event => {
            const newId = event.target.result;
            infoObject.id = newId;
            console.log("Location Link Info saved:", infoObject);

            addMarkerToMap(infoObject);

            if (typeof refreshInfoList === "function" && infoListPanel.style.display !== 'none') {
              refreshInfoList();
              console.log("Info List refreshed after adding Location Link.");
            }
          };

          addRequest.onerror = event => {
            console.error("Error saving Location Link Info:", event.target.error);
          };
        }
      }
    };
  }
}