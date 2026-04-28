<div class="plugin__mobile-header">Airspace Plugin</div>
<div class="plugin__content">
    <h4>Thailand Airspace</h4>
    
    <div class="toggle-container">
        <label class="switch">
            <input type="checkbox" bind:checked={isTMAVisible}>
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">Show TMA</span>
    </div>

    <div class="toggle-container">
        <label class="switch">
            <input type="checkbox" bind:checked={isDangerVisible}>
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">Show Danger Areas</span>
    </div>

    <div class="toggle-container">
        <label class="switch">
            <input type="checkbox" bind:checked={isRestrictedVisible}>
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">Show Restricted Areas</span>
    </div>

    <div class="toggle-container">
        <label class="switch">
            <input type="checkbox" bind:checked={isProhibitedVisible}>
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">Show Prohibited Areas</span>
    </div>

    <div style="font-size: 14px; color: #ff9900; font-weight: bold; margin-top: 15px;">
        {statusMessage}
    </div>

    <hr class="divider">
    <h4>Custom Flight Path</h4>

    <div class="flight-controls">
        <label class="action-button upload-btn">
            <input type="file" accept=".gpx" on:change={handleGPXUpload} style="display: none;">
            📂 Upload GPX
        </label>

        <button class="action-button {isDrawing ? 'active-draw' : ''}" on:click={toggleDrawingMode}>
            {isDrawing ? '🛑 Stop Drawing' : '✏️ Draw Path'}
        </button>

        <button class="action-button clear-btn" on:click={clearFlightPath}>
            🗑️ Clear
        </button>
    </div>

    <div class="donation-container">
        <a href="https://buy.stripe.com/7sY6oHaPpcwE6sdddc0x200" target="_blank" rel="noopener noreferrer" class="kofi-button">
            ☕ Buy me a coffee
        </a>
    </div>
</div>

<script context="module">
    let layerTMA = null;
    let layerDanger = null;
    let layerRestricted = null;
    let layerProhibited = null;
    let layerFlightPath = null; 

    // Keep initial states for module context
    let showTMA = true;
    let showDanger = true;
    let showRestricted = true;
    let showProhibited = true; 
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import { map } from '@windy/map';
    
    import tmaData from './data/Thailand TMA.js';
    import dangerData from './data/TH Danger areas.js';
    import restrictedData from './data/TH Restricted areas.js';
    import prohibitedData from './data/TH Prohibited areas.js';

    // --- HELPER FOR LOCAL STORAGE ---
    const getSavedState = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(`th-airspace-${key}`);
            return saved !== null ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    };

    // Initialize from LocalStorage or Defaults
    let isTMAVisible = getSavedState('tma', true);
    let isDangerVisible = getSavedState('danger', true);
    let isRestrictedVisible = getSavedState('restricted', true);
    let isProhibitedVisible = getSavedState('prohibited', true);
    
    let statusMessage = "Status: Initializing...";
    let isDrawing = false;
    
    // Load saved coordinates and wrap them in Leaflet LatLng objects
    let flightPathCoords = getSavedState('path', []).map(p => window.L.latLng(p.lat, p.lng));

    onMount(() => {
        // Cleanup old layers
        [layerTMA, layerDanger, layerRestricted, layerProhibited, layerFlightPath].forEach(l => {
            if (l && map.hasLayer(l)) map.removeLayer(l);
        });
        
        layerTMA = window.L.layerGroup();
        layerDanger = window.L.layerGroup();
        layerRestricted = window.L.layerGroup();
        layerProhibited = window.L.layerGroup();
        layerFlightPath = window.L.layerGroup().addTo(map); 
        
        let count = 0;

        function drawGeoJSON(data, targetLayer, defaultStyle) {
            try {
                const actualData = data?.default || data;
                if (actualData && actualData.features) {
                    actualData.features.forEach((feature) => {
                        window.L.geoJSON(feature, {
                            style: (feat) => ({
                                color: feat.properties.fill || defaultStyle.color, 
                                fillColor: feat.properties.fill || defaultStyle.fillColor, 
                                fillOpacity: defaultStyle.fillOpacity, 
                                opacity: 0.8, 
                                weight: 1.5, 
                                interactive: true 
                            }),
                            onEachFeature: (feat, layer) => {
                                const zoneName = feat.properties?.name || "Unknown Airspace Zone";
                                layer.bindPopup(`<div style="font-size: 14px; font-weight: bold; color: #333; text-align: center;">${zoneName}</div>`);
                            }
                        }).addTo(targetLayer);
                        count++;
                    });
                }
            } catch (err) { console.error("Drawing Error:", err); }
        }

        drawGeoJSON(tmaData, layerTMA, { color: '#1E90FF', fillColor: '#1E90FF', fillOpacity: 0.20 });
        drawGeoJSON(dangerData, layerDanger, { color: '#ffd700', fillColor: '#ffd700', fillOpacity: 0.15 });
        drawGeoJSON(restrictedData, layerRestricted, { color: '#ff8c00', fillColor: '#ff8c00', fillOpacity: 0.15 });
        drawGeoJSON(prohibitedData, layerProhibited, { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.15 });

        statusMessage = `Active: ${count} Total Airspace Zones`;
        
        // Restore layer visibility on mount
        if (isTMAVisible) layerTMA.addTo(map);
        if (isDangerVisible) layerDanger.addTo(map);
        if (isRestrictedVisible) layerRestricted.addTo(map);
        if (isProhibitedVisible) layerProhibited.addTo(map);

        // Restore flight path if coordinates exist
        if (flightPathCoords.length > 0) renderFlightPath();
    });

    onDestroy(() => {
        if (isDrawing) toggleDrawingMode();
    });

    function toggleLayer(layer, isVisible) {
        if (layer) {
            if (isVisible && !map.hasLayer(layer)) {
                layer.addTo(map);
            } else if (!isVisible && map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
    }

    // REACTIVE PERSISTENCE: Save settings whenever they change
    $: { 
        showTMA = isTMAVisible; 
        toggleLayer(layerTMA, isTMAVisible); 
        localStorage.setItem('th-airspace-tma', JSON.stringify(isTMAVisible));
    }
    $: { 
        showDanger = isDangerVisible; 
        toggleLayer(layerDanger, isDangerVisible); 
        localStorage.setItem('th-airspace-danger', JSON.stringify(isDangerVisible));
    }
    $: { 
        showRestricted = isRestrictedVisible; 
        toggleLayer(layerRestricted, isRestrictedVisible); 
        localStorage.setItem('th-airspace-restricted', JSON.stringify(isRestrictedVisible));
    }
    $: { 
        showProhibited = isProhibitedVisible; 
        toggleLayer(layerProhibited, isProhibitedVisible); 
        localStorage.setItem('th-airspace-prohibited', JSON.stringify(isProhibitedVisible));
    }

// ==========================================
    // FLIGHT PATH LOGIC
    // ==========================================

    function renderFlightPath() {
        if (!layerFlightPath) return;
        layerFlightPath.clearLayers();

        // Save current path to storage
        localStorage.setItem('th-airspace-path', JSON.stringify(flightPathCoords));

        if (flightPathCoords.length === 0) return;

        if (flightPathCoords.length > 1) {
            window.L.polyline(flightPathCoords, {
                color: '#FF00FF',
                weight: 2,
                opacity: 0.8,
                dashArray: '8, 8'
            }).addTo(layerFlightPath);
        }

        flightPathCoords.forEach((latlng, index) => {
            const marker = window.L.circleMarker(latlng, {
                radius: 5,
                fillColor: '#ffffff',
                color: '#FF00FF',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 1
            }).addTo(layerFlightPath);
            
            // Replace the whole try/catch tooltip block with this:
            marker.bindPopup(`<div style="text-align:center; font-weight:bold;">WPT ${index + 1}</div>`);
        });
    }

    function handleDrawingClick(e) {
        if (!isDrawing) return;
        e.stopPropagation();
        e.preventDefault();
        const latlng = map.mouseEventToLatLng(e);
        flightPathCoords = [...flightPathCoords, latlng];
        renderFlightPath();
    }

    function toggleDrawingMode() {
        isDrawing = !isDrawing;
        const mapContainer = map.getContainer();
        if (isDrawing) {
            mapContainer.addEventListener('click', handleDrawingClick, true);
            mapContainer.style.cursor = 'crosshair';
        } else {
            mapContainer.removeEventListener('click', handleDrawingClick, true);
            mapContainer.style.cursor = '';
        }
    }

    function clearFlightPath() {
        flightPathCoords = [];
        renderFlightPath();
        if (isDrawing) toggleDrawingMode(); 
    }

    function handleGPXUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            flightPathCoords = [];
            let points = Array.from(xmlDoc.getElementsByTagName("trkpt"));
            if (points.length === 0) points = Array.from(xmlDoc.getElementsByTagName("rtept"));

            points.forEach(pt => {
                const lat = parseFloat(pt.getAttribute("lat"));
                const lon = parseFloat(pt.getAttribute("lon"));
                if (!isNaN(lat) && !isNaN(lon)) flightPathCoords.push(window.L.latLng(lat, lon));
            });

            if (flightPathCoords.length > 0) {
                renderFlightPath();
                const bounds = window.L.latLngBounds(flightPathCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                alert("Could not find any standard track/route points in this GPX file.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    }
</script>

<style>
    /* CSS remains exactly the same as your provided code */
    .plugin__content { padding: 15px; color: white; }
    h4 { margin-bottom: 10px; }
    .toggle-container { display: flex; align-items: center; margin-top: 10px; }
    .toggle-label { margin-left: 10px; font-size: 15px; font-weight: bold; cursor: pointer; }
    .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
    input:checked + .slider { background-color: #ff9900; }
    input:checked + .slider:before { transform: translateX(18px); }
    .slider.round { border-radius: 22px; }
    .slider.round:before { border-radius: 50%; }
    .divider { border: 0; border-top: 1px solid #555; margin: 20px 0 15px 0; }
    .flight-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .action-button { background-color: #444; color: white; border: 1px solid #666; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: all 0.2s; text-align: center; }
    .action-button:hover { background-color: #555; }
    .upload-btn { cursor: pointer; }
    .active-draw { background-color: #ff4444; border-color: #ff4444; }
    .active-draw:hover { background-color: #cc0000; }
    .clear-btn:hover { background-color: #ff9900; border-color: #ff9900;}
    .donation-container { margin-top: 25px; padding-top: 15px; border-top: 1px solid #555; }
    .kofi-button { display: inline-block; background-color: #29abe0; color: white !important; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; transition: background-color 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .kofi-button:hover { background-color: #1a8fbf; text-decoration: none; }
</style>