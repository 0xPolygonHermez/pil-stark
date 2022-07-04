
const { buildProtoboard } = require("wasmbuilder");

function build(module) {
    const f = module.addFunction("add");
    f.addParam("al", "i32");
    f.addParam("ah", "i32");
    f.addParam("bl", "i32");
    f.addParam("bh", "i32");
    f.setReturnType("i32");

    const c = f.getCodeBuilder();
    f.addCode(
        c.i32_add(c.getLocal("al", c.getLocal("bl")))
    )


    module.exportFunction("test1");

}


module.exports = async function buildGL() {
    const pb = buildProtoboard(build);
    return pb;
}