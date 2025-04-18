const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const fetchPosition = async (bodyId) => {
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${bodyId}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500'&START_TIME='${dateStr} 00:00'&STOP_TIME='${dateStr} 00:01'&STEP_SIZE='1 m'`;

      const response = await fetch(url);
      const text = await response.text();

      const lines = text.split('\n');
      const dataStart = lines.findIndex(line => line.trim() === '$$SOE') + 1;
      const dataEnd = lines.findIndex(line => line.trim() === '$$EOE');

      if (dataStart < 1 || dataEnd <= dataStart) {
        throw new Error("No vector data returned from Horizons:\n" + text);
      }

      const vectorLine = lines[dataStart]?.trim();
      if (!vectorLine) throw new Error("No vector line found in Horizons response.");

      const parts = vectorLine.split(/\s+/);
      if (parts.length < 5) throw new Error(`Malformed vector line: ${vectorLine}`);

      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);
      const z = parseFloat(parts[4]);
      return { x, y, z };
    };

    const earth = await fetchPosition(399); // Earth
    const mars = await fetchPosition(499);  // Mars

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
