const fetch = require('node-fetch');

let cache = {
  timestamp: 0,
  data: null
};

exports.handler = async function () {
  const now = Date.now();

  // Serve from cache if < 60 seconds old
  if (cache.data && now - cache.timestamp < 60000) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(cache.data)
    };
  }

  try {
    // Format start and stop time in UTC
    const nowDate = new Date();
    const plus1 = new Date(nowDate.getTime() + 60 * 1000); // 1 minute later

    const format = (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

    const startTime = format(nowDate);
    const stopTime = format(plus1);

    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&CENTER='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&START_TIME='${startTime}'&STOP_TIME='${stopTime}'&STEP_SIZE='1 m'`;

    const response = await fetch(url);
    const text = await response.text();

    // Match all LT and RG lines, grab the last one
    const ltLines = text.match(/LT\s*=\s*[\d.]+/g);
    const rgLines = text.match(/RG\s*=\s*[\d.]+/g);

    const ltMatch = ltLines?.[ltLines.length - 1]?.match(/([\d.]+)/);
    const rgMatch = rgLines?.[rgLines.length - 1]?.match(/([\d.]+)/);

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
