const fs = require("fs");
const path = require("path");
const version = require("../../package").version;

const buildCHelpers = require("./chelpers/fflonk_chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -f <fflonkinfo.json> -c <chelpers.cpp>")
    .alias("f", "fflonkinfo")
    .alias("c", "chelpers")
    .alias("m", "multiple")
    .alias("o", "optcodes")
    .argv;

async function run() {
    const fflonkInfoFile = typeof (argv.fflonkinfo) === "string" ? argv.fflonkinfo.trim() : "mycircuit.fflonkinfo.json";
    const chelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers.cpp";
    const multipleCodeFiles = argv.multiple;
    const optcodes = argv.optcodes;

    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
    
    const cCode = buildCHelpers(fflonkInfo, multipleCodeFiles ? { multipleCodeFiles: true, optcodes: optcodes } : {});

    if (multipleCodeFiles) {
        const baseDir = path.dirname(chelpersFile);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const dotPos = chelpersFile.lastIndexOf('.');
        const leftFilename = dotPos < 0 ? chelpersFile : chelpersFile.substr(0, dotPos);
        const ext = dotPos < 0 ? '.cpp' : chelpersFile.substr(dotPos);
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
