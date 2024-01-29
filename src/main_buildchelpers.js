const fs = require("fs");
const path = require("path");
const version = require("../package").version;

const buildCHelpers = require("./stark/chelpers/stark_chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -s <starkinfo.json> -c <chelpers.cpp> [-C <classname>]")
    .alias("s", "starkinfo")
    .alias("c", "chelpers")
    .alias("C", "cls")
    .alias("m", "multiple")
    .alias("o", "optcodes")
    .alias("b", "binfile")
    .argv;

async function run() {
    const cls = typeof (argv.cls) === "string" ? argv.cls.trim() : "Stark";
    const starkInfoFile = typeof (argv.starkinfo) === "string" ? argv.starkinfo.trim() : "mycircuit.starkinfo.json";
    const chelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers.cpp";
    const binFile = typeof (argv.binfile) === "string" ? argv.binfile.trim() : "mycircuit.chelpers.bin";
    const multipleCodeFiles = argv.multiple;
    const optcodes = argv.optcodes;

    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));

    const cCode = await buildCHelpers(starkInfo, multipleCodeFiles ? { multipleCodeFiles: true, className: cls, optcodes, binFile } : config);

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
                code = `#include "goldilocks_cubic_extension.hpp"\n#include "zhInv.hpp"\n#include "starks.hpp"\n#include "constant_pols_starks.hpp"\n#include "${classInclude}"\n\n` + cCode[cpart];
                ext2 = ext;
            } else if(cpart.includes("parser_hpp")) {
                code = cCode[cpart];
                cpart = cpart.replace("parser_hpp", "parser").replace(/_/g, ".");
                ext2 = ".hpp";
            } else if(cpart.includes("parser_cpp")) {
                let cpartName = cpart.replace("parser_cpp", "parser").replace(/_/g, ".");
                code = `#include "goldilocks_cubic_extension.hpp"\n#include "zhInv.hpp"\n#include "starks.hpp"\n#include "constant_pols_starks.hpp"\n#include "${classInclude}"\n#include "${leftFilename.substring(leftFilename.lastIndexOf("/") + 1)}.${cpartName}.hpp" \n#include <immintrin.h>\n\n` + cCode[cpart];
                cpart = cpart.replace("parser_cpp", "parser").replace(/_/g, ".");
                ext2 = ".cpp";
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
