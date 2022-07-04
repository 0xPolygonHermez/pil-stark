
const { buildProtoboard } = require("wasmbuilder");

function build(module) {
    const f = module.addFunction("add");
    f.addParam("a", "i64");
    f.addParam("b", "i64");
    f.addLocal("r0", "i64");
    f.addLocal("r1", "i64");

    f.setReturnType("i64");

    const c = f.getCodeBuilder();
    f.addCode(
        c.setLocal("r0", c.i64_add(low(c.getLocal("a")),  low(c.getLocal("b")))),
        c.setLocal("r1",
            c.i64_add(
                high(c.getLocal("r0")),
                c.i64_add(
                    high(c.getLocal("a")),
                    high(c.getLocal("b"))
                )
            )
        ),
        c.if(
            c.i64_eqz(high(c.getLocal("r1"))),
            [],
            [
                ...c.setLocal("r0", c.i64_add(low(c.getLocal("r0")), c.i64_const(0xFFFFFFFF))),
                ...c.setLocal("r1", c.i64_add(low(c.getLocal("r1")), high(c.getLocal("r0")))),
                ...c.if(
                    c.i64_eqz(high(c.getLocal("r1"))),
                    [],
                    [
                        ...c.setLocal("r0", c.i64_add(low(c.getLocal("r0")), c.i64_const(0xFFFFFFFF))),
                        ...c.setLocal("r1", c.i64_add(low(c.getLocal("r1")), high(c.getLocal("r0"))))
                    ]
                )
            ]
        ),
        c.i64_add(c.i64_shl(low(c.getLocal("r1")), c.i64_const(32)), low(c.getLocal("r0"))  )
    );


    module.exportFunction("add");

    function low( a ) {
        return c.i64_and(a, c.i64_const(0xFFFFFFFF));
    }

    function high( a ) {
        return c.i64_shr_u(a, c.i64_const(32));
    }
}


module.exports = async function buildGL() {
    const pb = await buildProtoboard(build);
    return pb;
}