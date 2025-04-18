const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const fetchPositionRaw = async (bodyId) => {
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${bodyId}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500'&START_TIME='${dateStr} 00:00'&STOP_TIME='${dateStr} 00:01'&STEP_SIZE='1 m'`;

      const response = await fetch(url);
      return await response.text();
    };

    const marsText = await fetchPositionRaw(499);
    const earthText = await fetchPositionRaw(399);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Raw vector text from NASA Horizons",
        mars: marsText,
        earth: earthText
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
