const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const min = String(now.getUTCMinutes()).padStart(2, '0');

    const dateTimeStr = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

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

    // Round-trip light time
    const totalSec = ltSec * 2;
    const minutes = Math.floor(totalSec / 60);
    const seconds = (totalSec % 60).toFixed(2);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        lightTime: { minutes, seconds },
        distanceKm: rgKm.toFixed(0)
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: "Something went wrong",
        message: err.message
      })
    };
  }
};
