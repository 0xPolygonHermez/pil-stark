const fs = require("fs");
const path = require("path");
const version = require("../../package").version;
const { readPilFflonkZkeyFile } = require("./zkey/zkey_pilfflonk");

const buildCHelpers = require("./chelpers/fflonk_chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -f <fflonkinfo.json> -z <circuit.zkey> -c <chelpers.cpp> [-C <classname>]")
    .alias("f", "fflonkinfo")
    .alias("z", "zkey")
    .alias("c", "chelpers")
    .alias("C", "cls")
    .alias("m", "multiple")
    .alias("o", "optcodes")
    .argv;

async function run() {
    const cls = typeof (argv.cls) === "string" ? argv.cls.trim() : "Fflonk";
    const fflonkInfoFile = typeof (argv.fflonkinfo) === "string" ? argv.fflonkinfo.trim() : "mycircuit.fflonkinfo.json";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const chelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers.cpp";
    const multipleCodeFiles = argv.multiple;
    const optcodes = argv.optcodes;

    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
    
    const options = {logger: console};

    // Load zkey file
    if (options.logger) options.logger.info("> Reading zkey file");
    const zkey = await readPilFflonkZkeyFile(zkeyFile, {logger: options.logger});

    const cCode = buildCHelpers(zkey, fflonkInfo, multipleCodeFiles ? { multipleCodeFiles: true, className: cls, optcodes: optcodes } : {});

    if (multipleCodeFiles) {
        const baseDir = path.dirname(chelpersFile);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const dotPos = chelpersFile.lastIndexOf('.');
        const leftFilename = dotPos < 0 ? chelpersFile : chelpersFile.substr(0, dotPos);
        const ext = dotPos < 0 ? '.cpp' : chelpersFile.substr(dotPos);
        const classInclude = cls.charAt(0).toLowerCase() + cls.slice(1) + ".hpp";
        for (cpart in cCode) {
            console.log(cpart);
            let code, ext2;
            if (!cpart.includes("parser")) {
                code = `#include <alt_bn128.hpp>\n#include "pilfflonk_steps.hpp"\n\n` + cCode[cpart];
                ext2 = ext;
            } else {
                code = cCode[cpart];
                cpart = cpart.replace(/_/g, ".");
                ext2 = ".hpp";
            }
            await fs.promises.writeFile(leftFilename + '.' + cpart + ext2, code, "utf8");
        }
    } else {
        await fs.promises.writeFile(chelpersFile, cCode, "utf8");
    }

    console.log("files Generated Correctly");
}

run().then(() => {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
