const fs = require("fs");
const version = require("../../package").version;

const { F1Field, utils } = require("ffjavascript");
const { stringifyBigInts } = utils;
const fflonkShKey = require("./helpers/fflonk_shkey.js");
const { compile } = require("pilcom");

const argv = require("yargs")
    .version(version)
    .usage(
        "node main_shkey.js -p <my.pil> -P [-P <pilconfig.json>] -f <fflonkInfo.json> -t <powers.ptau> -e <2> -s <pil.shkey>"
    )
    .alias("p", "pil") // Input -> Proposed PIL
    .alias("P", "pilconfig")
    .alias("f", "fflonkInfo")
    .alias("t", "ptau") // Input -> ptau
    .alias("s", "shkey") // Output -> File required to execute
    .alias("e", "extraMuls")
    .alias("q", "maxQDegree")
    .argv;

async function run() {
    const F = new F1Field(
        21888242871839275222246405745257275088548364400416034343698204186575808495617n
    );

    const pilFile = typeof argv.pil === "string" ? argv.pil.trim() : "my.pil";
    const pilConfig =
        typeof argv.pilconfig === "string"
            ? JSON.parse(fs.readFileSync(argv.pilconfig.trim()))
            : {};
    const fflonkInfoFile =
        typeof argv.fflonkInfo === "string"
            ? argv.fflonkInfo.trim()
            : "fflonkInfo.json";
    const ptauFile =
        typeof argv.ptau === "string" ? argv.ptau.trim() : "powers.ptau";
    const shkeyFile =
        typeof argv.shkey === "string" ? argv.shkey.trim() : "pil.shkey";

    const maxQDegree = Number(argv.maxQDegree) || 0;
    const extraMuls = Number(argv.extraMuls) || 2;

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfig);

    const fflonkInfoRaw = await fs.promises.readFile(fflonkInfoFile, "utf8");
    const fflonkInfo = JSON.parse(fflonkInfoRaw);

    let { zkey: shKey } = await fflonkShKey(ptauFile, fflonkInfo, {
        extraMuls, maxQDegree
    });

    shKey = stringifyBigInts(shKey);
    await fs.promises.writeFile(shkeyFile, JSON.stringify(shKey, null, 1));

    console.log("shkey file written to", shkeyFile);
}

run().then(
    () => {
        process.exit(0);
    },
    (err) => {
        console.log(err.message);
        console.log(err.stack);
        process.exit(1);
    }
);
