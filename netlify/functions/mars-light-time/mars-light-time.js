const fetch = require("node-fetch");

let cache = {
  timestamp: 0,
  data: null,
};

exports.handler = async function () {
  const now = Date.now();

  if (cache.data && now - cache.timestamp < 60000) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(cache.data),
    };
  }

  try {
    const nowDate = new Date();
    const plus1 = new Date(nowDate.getTime() + 60 * 1000);

    const format = (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getUTCDate()).padStart(2, "0")} ${String(
        d.getUTCHours()
      ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

    const startTime = format(nowDate);
    const stopTime = format(plus1);

    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&CENTER='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&START_TIME='${startTime}'&STOP_TIME='${stopTime}'&STEP_SIZE='1 m'`;

    const response = await fetch(url);
    const text = await response.text();

    // Extract block between $$SOE and $$EOE
    const blockMatch = text.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
    if (!blockMatch) throw new Error("Vector block not found in response.");

    const vectorBlock = blockMatch[1];
    const lines = vectorBlock.trim().split("\n");

    let lastLT = null;
    let lastRG = null;

    for (let line of lines) {
      if (line.includes("LT=") && line.includes("RG=")) {
        const ltMatch = line.match(/LT=\s*([\d.]+)/);
        const rgMatch = line.match(/RG=\s*([\d.]+)/);
        if (ltMatch && rgMatch) {
          lastLT = parseFloat(ltMatch[1]);
          lastRG = parseFloat(rgMatch[1]);
        }
      }
    }

    if (!lastLT || !lastRG) {
      throw new Error("Could not extract LT and RG from parsed vector block.");
    }

    const minutes = Math.floor(lastLT / 60);
    const seconds = (lastLT % 60).toFixed(2);

    const result = {
      lightTime: { minutes, seconds },
      distanceKm: lastRG.toFixed(0),
    };

    cache.data = result;
    cache.timestamp = now;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Something went wrong",
        message: err.message,
      }),
    };
  }
};
