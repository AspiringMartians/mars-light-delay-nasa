const fetch = require('node-fetch');

// In-memory cache (shared across warm invocations)
let cache = {
  timestamp: 0,
  data: null
};

exports.handler = async function () {
  const now = Date.now();

  // If cached data is less than 60 seconds old, return it
  if (cache.data && now - cache.timestamp < 60000) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(cache.data)
    };
  }

  try {
    // Get current UTC time
    const nowDate = new Date();
    const yyyy = nowDate.getUTCFullYear();
    const mm = String(nowDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(nowDate.getUTCDate()).padStart(2, '0');
    const hh = String(nowDate.getUTCHours()).padStart(2, '0');
    const min = String(nowDate.getUTCMinutes()).padStart(2, '0');
    const dateTimeStr = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

    // Build NASA Horizons API URL
    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&CENTER='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&START_TIME='${dateTimeStr}'&STOP_TIME='${dateTimeStr}'&STEP_SIZE='1 m'`;

    const response = await fetch(url);
    const text = await response.text();

    const ltMatch = text.match(/LT=\s*([\d.]+)/);
    const rgMatch = text.match(/RG=\s*([\d.]+)/);

    if (!ltMatch || !rgMatch) {
      throw new Error("Could not extract LT or RG from response:\n" + text);
    }

    const ltSec = parseFloat(ltMatch[1]);
    const rgKm = parseFloat(rgMatch[1]);

    const roundTripSec = ltSec * 2;
    const minutes = Math.floor(roundTripSec / 60);
    const seconds = (roundTripSec % 60).toFixed(2);

    const result = {
      lightTime: { minutes, seconds },
      distanceKm: rgKm.toFixed(0)
    };

    // Cache it
    cache.data = result;
    cache.timestamp = now;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Something went wrong",
        message: err.message
      })
    };
  }
};
