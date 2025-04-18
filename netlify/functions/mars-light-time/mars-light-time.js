const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const fetchXYZ = async (bodyId) => {
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${bodyId}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500'&START_TIME='${dateStr} 00:00'&STOP_TIME='${dateStr} 00:01'&STEP_SIZE='1 m'`;
      const response = await fetch(url);
      const text = await response.text();

      const xMatch = text.match(/X =\s*([-\d.E+]+)/);
      const yMatch = text.match(/Y =\s*([-\d.E+]+)/);
      const zMatch = text.match(/Z =\s*([-\d.E+]+)/);

      if (!xMatch || !yMatch || !zMatch) {
        throw new Error("Could not extract X, Y, Z from response:\n" + text);
      }

      return {
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1]),
        z: parseFloat(zMatch[1])
      };
    };

    const mars = await fetchXYZ(499);
    const earth = await fetchXYZ(399);

    const dx = mars.x - earth.x;
    const dy = mars.y - earth.y;
    const dz = mars.z - earth.z;
    const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const lightSpeed = 299792.458;
    const totalSeconds = distanceKm / lightSpeed;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        lightTime: { minutes, seconds },
        distanceKm: distanceKm.toFixed(0)
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
