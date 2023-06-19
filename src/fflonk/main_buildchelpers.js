const fs = require("fs");
const path = require("path");
const version = require("../package").version;

const buildCHelpers = require("./chelpers/fflonk_chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -s <fflonkinfo.json> -c <chelpers.cpp> [-C <classname>]")
    .alias("f", "fflonkinfo")
    .alias("c", "chelpers")
    .alias("C", "cls")
    .alias("m", "multiple")
    .alias("o", "optcodes")
    .argv;

async function run() {
    const cls = typeof (argv.cls) === "string" ? argv.cls.trim() : "Fflonk";
    const fflonkInfoFile = typeof (argv.fflonkInfo) === "string" ? argv.fflonkInfo.trim() : "mycircuit.fflonkinfo.json";
    const chelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers.cpp";
    const multipleCodeFiles = argv.multiple;
    const optcodes = argv.optcodes;

    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));

    const cCode = await buildCHelpers(fflonkInfo, multipleCodeFiles ? { multipleCodeFiles: true, className: cls, optcodes: optcodes } : {});

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
            let code, ext2;
            if (!cpart.includes("parser")) {
                code = `#include "goldilocks_cubic_extension.hpp"\n#include "zhInv.hpp"\n#include "fflonk.hpp"\n#include "constant_pols_fflonk.hpp"\n#include "${classInclude}"\n\n` + cCode[cpart];
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
