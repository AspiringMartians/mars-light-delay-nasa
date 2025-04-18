const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const today = new Date().toISOString().split('T')[0];

    const fetchPosition = async (bodyId) => {
      const response = await fetch(
        `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${bodyId}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500'&START_TIME='${today}'&STOP_TIME='${today}'&STEP_SIZE='1 d'`
      );

      const text = await response.text();
      const lines = text.split('\n');
      const dataStart = lines.findIndex(line => line.trim() === '$$SOE') + 1;
      const dataEnd = lines.findIndex(line => line.trim() === '$$EOE');
      const vectorLine = lines[dataStart];

      const parts = vectorLine.trim().split(/\s+/);
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);
      const z = parseFloat(parts[4]);

      return { x, y, z };
    };

    const mars = await fetchPosition(499);
    const earth = await fetchPosition(399);

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
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        lightTime: { minutes, seconds },
        distanceKm: distanceKm.toFixed(0)
      })
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
