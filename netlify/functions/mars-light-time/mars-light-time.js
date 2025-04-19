const fetch = require('node-fetch');

let cache = {
  timestamp: 0,
  data: null
};

exports.handler = async function () {
  const now = Date.now();

  if (cache.data && now - cache.timestamp < 60000) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(cache.data)
    };
  }

  try {
    const nowDate = new Date();
    const plus1 = new Date(nowDate.getTime() + 60000);

    const format = (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

    const startTime = format(nowDate);
    const stopTime = format(plus1);

    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&CENTER='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&START_TIME='${startTime}'&STOP_TIME='${stopTime}'&STEP_SIZE='1 m'`;

    const response = await fetch(url);
    const text = await response.text();

    // Grab just the ephemeris section
    const ephemerisMatch = text.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
    if (!ephemerisMatch) {
      throw new Error("Could not locate ephemeris data block");
    }

    const ephemerisData = ephemerisMatch[1];

    // Now extract LT and RG from that block
    const ltMatch = ephemerisData.match(/LT\s*=\s*([-\d.E+]+)/);
    const rgMatch = ephemerisData.match(/RG\s*=\s*([-\d.E+]+)/);

    if (!ltMatch || !rgMatch) {
      throw new Error("Could not extract LT or RG from ephemeris block:\n" + ephemerisData);
    }

    const ltSec = parseFloat(ltMatch[1]);
    const rgKm = parseFloat(rgMatch[1]);

    const roundTripSec = ltSec;
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
