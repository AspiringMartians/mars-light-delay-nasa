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

    const blockMatch = text.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
    if (!blockMatch) throw new Error("Vector block not found in response.");

    const vectorBlock = blockMatch[1].trim();
    const lines = vectorBlock.split("\n");

    let lt = null;
    let rg = null;

    for (const line of lines.reverse()) {
      if (line.includes("LT=") && line.includes("RG=")) {
        const ltMatch = line.match(/LT=\s*([\d.]+)/);
        const rgMatch = line.match(/RG=\s*([\d.]+)/);
        console.log("Parsing line:", line);

        if (ltMatch && rgMatch) {
          lt = parseFloat(ltMatch[1]);
          rg = parseFloat(rgMatch[1]);
          break;
        }
      }
    }

    if (!lt || !rg) {
      throw new Error("Could not extract LT or RG from:\n" + vectorBlock);
    }

    const minutes = Math.floor(lt / 60);
    const seconds = (lt % 60).toFixed(2);

    const result = {
      lightTime: { minutes, seconds },
      distanceKm: rg.toFixed(0),
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
