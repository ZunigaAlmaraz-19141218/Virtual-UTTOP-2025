// ===========================
// ENIT Campus Navigation - INFOS
// Handles IndexedDB, Info Markers, Info List Panel
// ===========================

// === Initialize IndexedDB ===
let db;

const request = indexedDB.open("CampusAppDB", 1);

request.onerror = event => {
  console.error("Database error:", event.target.error);
};

request.onsuccess = event => {
  db = event.target.result;
  console.log("IndexedDB opened successfully");

  // Load existing markers on map
  loadAllMarkers();
  checkAndSaveUrlMarker();  
};

request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore("infos", { keyPath: "id", autoIncrement: true });
};

// === UI elements ===
const btnAddInfo = $('btnAddInfo');
const infoForm = $('infoForm');
const btnSaveInfo = $('btnSaveInfo');
const btnCancelInfo = $('btnCancelInfo');
const fileInput = $('hiddenFileInput');
const preview = $('preview');
const infoComment = $('infoComment');

// === Add Info button toggle ===
btnAddInfo.addEventListener('click', () => {
  infoForm.style.display = (infoForm.style.display === 'none' || infoForm.style.display === '') ? 'block' : 'none';
});

// === Cancel Info Form ===
btnCancelInfo.addEventListener('click', () => {
  infoForm.style.display = 'none';
  infoComment.value = '';
  fileInput.value = '';
  preview.src = '';
});

// === Image preview ===
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = '';
  }
});

// === Save Info button ===
btnSaveInfo.addEventListener('click', () => {
  let position;

  if (marker2D) {
    // GPS active → use current position
    position = marker2D.getLatLng();
  } else {
    // No GPS → fallback to Building C
    position = L.latLng(43.224918, 0.050762);
    showBanner('No GPS active. Using default position: Building C');
  }

  const comment = infoComment.value;
  const markerType = $('infoMarkerType').value;
  const file = fileInput.files[0] || null;

  // Read image as base64 or null
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      const imageData = e.target.result;
      saveInfo(position, comment, imageData, markerType);
    };
    reader.readAsDataURL(file);
  } else {
    saveInfo(position, comment, null, markerType);
  }

  // Reset form
  infoForm.style.display = 'none';
  infoComment.value = '';
  fileInput.value = '';
  preview.src = '';
});

// === Save Info to IndexedDB ===
function saveInfo(position, comment, imageData, markerType) {
  const tx = db.transaction("infos", "readwrite");
  const store = tx.objectStore("infos");

  const infoObject = {
    lat: position.lat,
    lon: position.lng,
    comment: comment,
    image: imageData,
    markerType: markerType,
    timestamp: Date.now()
  };

  const addRequest = store.add(infoObject);

  addRequest.onsuccess = event => {
    const newId = event.target.result;
    infoObject.id = newId;
    console.log("Information saved:", infoObject);
    addMarkerToMap(infoObject);
  };

  addRequest.onerror = event => {
    console.error("Error saving information:", event.target.error);
  };
}

// === Marker storage ===
let infoMarkers = [];

// === Add Marker to Map ===
function addMarkerToMap(infoObject) {
  let markerHtml = '';

  if (infoObject.markerType === 'tree') {
    markerHtml = '<div style="width:18px;height:18px;background:green;border-radius:50%;border:2px solid #fff;"></div>';
  } else if (infoObject.markerType === 'cross') {
    markerHtml = `
      <div style="width:18px;height:18px;background:red;position:relative;">
        <div style="position:absolute;top:4px;left:8px;width:2px;height:10px;background:#fff;"></div>
        <div style="position:absolute;top:8px;left:4px;width:10px;height:2px;background:#fff;"></div>
      </div>
    `;
  }else if (infoObject.markerType === 'LoactionLink') {
    markerHtml = '<div style="width:18px;height:18px;background:orange;border-radius:50%;border:2px solid #fff;"></div>';
  }else {
    markerHtml = '<div style="width:18px;height:18px;background:blue;border-radius:50%;border:2px solid #fff;"></div>';
  }

  const marker = L.marker([infoObject.lat, infoObject.lon], {
    draggable: true,
    icon: L.divIcon({
      className: 'custom-info-marker',
      html: markerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(map2D);

  infoMarkers.push({ id: infoObject.id, marker: marker });

  marker.bindPopup(`
    <strong>Comment:</strong> ${infoObject.comment || '(none)'}<br>
    <strong>Type:</strong> ${infoObject.markerType}<br>
    ${infoObject.image ? `<img src="${infoObject.image}" width="200">` : ''}
  `);

  // On dragend → update position in DB
  marker.on('dragend', () => {
    const newPos = marker.getLatLng();
    console.log("Marker moved to:", newPos);

    const tx = db.transaction("infos", "readwrite");
    const store = tx.objectStore("infos");
    const getRequest = store.get(infoObject.id);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      data.lat = newPos.lat;
      data.lon = newPos.lng;

      const updateRequest = store.put(data);

      updateRequest.onsuccess = () => {
        console.log("Marker position updated in DB.");
        if (infoListPanel.style.display !== 'none') {
          refreshInfoList();
        }
      };
    };
  });
}

// === Load all Markers on Map ===
function loadAllMarkers() {
  const tx = db.transaction("infos", "readonly");
  const store = tx.objectStore("infos");

  store.openCursor().onsuccess = event => {
    const cursor = event.target.result;
    if (cursor) {
      const info = cursor.value;
      addMarkerToMap(info);
      cursor.continue();
    }
  };
}

// === Info List Panel ===
const btnViewInfos = $('btnViewInfos');
const infoListPanel = $('infoListPanel');
const infoList = $('infoList');

btnViewInfos.addEventListener('click', () => {
  if (infoListPanel.style.display === 'none' || infoListPanel.style.display === '') {
    infoListPanel.style.display = 'block';

    // ALWAYS refresh when opening panel!
    refreshInfoList();
    console.log("Info List refreshed after opening panel.");
  } else {
    infoListPanel.style.display = 'none';
  }
});


// === Refresh Info List ===
function refreshInfoList() {
  infoList.innerHTML = '<em>Loading...</em>';

  const tx = db.transaction("infos", "readonly");
  const store = tx.objectStore("infos");

  const infos = [];

  store.openCursor().onsuccess = event => {
    const cursor = event.target.result;
    if (cursor) {
      infos.push(cursor.value);
      cursor.continue();
    } else {
      if (infos.length === 0) {
        infoList.innerHTML = '<p>No information saved yet.</p>';
        return;
      }

      // Render list
      infoList.innerHTML = infos.map(info => {
        let iconHtml = '';
        let markerName = '';

        if (info.markerType === 'tree') {
          markerName = 'Tree';
          iconHtml = '<div style="width:18px;height:18px;background:green;border-radius:50%;border:2px solid #fff; display:inline-block;"></div>';
        } else if (info.markerType === 'cross') {
          markerName = 'Cross';
          iconHtml = `
            <div style="width:18px;height:18px;background:red;position:relative; display:inline-block;">
              <div style="position:absolute;top:4px;left:8px;width:2px;height:10px;background:#fff;"></div>
              <div style="position:absolute;top:8px;left:4px;width:10px;height:2px;background:#fff;"></div>
            </div>
          `;
        } else if (info.markerType === 'LoactionLink') {
          iconHtml = '<div style="width:18px;height:18px;background:orange;border-radius:50%;border:2px solid #fff; display:inline-block;"></div>';
        }
         else {
          markerName = 'Unknown';
          iconHtml = '<div style="width:18px;height:18px;background:blue;border-radius:50%;border:2px solid #fff; display:inline-block;"></div>';
        }

        return `
          <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
            <strong>Comment:</strong> ${info.comment || '(none)'}<br>
            <strong>Type:</strong> ${markerName} ${iconHtml}<br>
            <strong>Lat:</strong> ${info.lat.toFixed(6)}<br>
            <strong>Lon:</strong> ${info.lon.toFixed(6)}<br>
            <strong>Time:</strong> ${new Date(info.timestamp).toLocaleString()}<br>
            ${info.image ? `<img src="${info.image}" width="200"><br>` : ''}
            <button onclick="uploadInfo(${info.id})" style="margin-top:6px;">Upload to Server</button>
            <button onclick="deleteInfo(event, ${info.id})" style="margin-top:6px; margin-left:6px;">Delete</button>
          </div>
        `;
      }).join('');
    }
  };
}

// === Close Info List Panel ===
const btnCloseInfoPanel = $('btnCloseInfoPanel');

btnCloseInfoPanel.addEventListener('click', () => {
  infoListPanel.style.display = 'none';
});

// === Upload Info (placeholder) ===
function uploadInfo(id) {
  console.log("Upload requested for info ID:", id);
  showBanner("Upload not implemented yet.");
}

// === Delete Info ===
function deleteInfo(event, id) {
  event.stopPropagation();

  const tx = db.transaction("infos", "readwrite");
  const store = tx.objectStore("infos");

  const deleteRequest = store.delete(id);

  deleteRequest.onsuccess = () => {
    console.log("Info ID", id, "deleted.");
    showBanner("Information deleted.");

    // Remove marker from map
    const markerEntry = infoMarkers.find(entry => entry.id === id);
    if (markerEntry) {
      map2D.removeLayer(markerEntry.marker);
      infoMarkers = infoMarkers.filter(entry => entry.id !== id);
      console.log("Marker for Info ID", id, "removed from map.");
    }

    // Refresh list
    if (infoListPanel.style.display !== 'none') {
      refreshInfoList();
    }
  };

  deleteRequest.onerror = event => {
    console.error("Error deleting info:", event.target.error);
    showBanner("Error deleting information.");
  };
}
