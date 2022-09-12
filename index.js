const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const beautify = require("js-beautify");
const { readFileSync, writeFile } = require("fs");
const { Referenced } = require("@babel/traverse/lib/path/lib/virtual-types");
const { constants } = require("buffer");const { type } = require("os");
const { table } = require("console");
;

function deobfuscate(code_in) {
    const ast = parser.parse(code_in);

    var tableLol = []
    /* Removing all the unused variables and functions. */
    let removeJunkCode = {
        "VariableDeclarator|FunctionDeclaration"(path) {
            let {node, scope} = path
            let {constant, referenced} = scope.getBinding(node.id.name)
            if(constant && !referenced) {
                console.log(node.id.name, "removed")
                path.remove()
            }
        },
        EmptyStatement(path){
            console.log("Empty statement removed")
            path.remove()
        }
    }

    traverse(ast, removeJunkCode)

    let ConstantFoldingEvaluation = {
        BinaryExpression(path) {
            let { confident, value } = path.evaluate(); // Evaluate the binary expression
            if (!confident) return; // Skip if not confident
            let actualVal = t.valueToNode(value); // Create a new node, infer the type
            if (!t.isLiteral(actualVal)) return; // Skip if not a Literal type (e.g. StringLiteral, NumericLiteral, Boolean Literal etc.)
            path.replaceWith(actualVal); // Replace the BinaryExpression with the simplified value
        }
    }

    traverse(ast, ConstantFoldingEvaluation)

    

    let hexadecimalToString = {
        ArrayExpression(path) {
            let {container} = path
            if(container.id?.name) {
                if(container.id.name === "_" || container.id.name === "tools"){
                    container.id.name = "tools"
                    let {init} = container
                    for (let node of init.elements) {
                        tableLol.push(node.value.split(' ').join(''))
                        node.extra.raw = node.value
                    }
                }
            }
        }
    }

    traverse(ast, hexadecimalToString)

    let renameGlobalStringVariable = {
        MemberExpression(path) {
            let {node, scope} = path
            if( node.object.name === "_") {
                path.replaceWith(t.valueToNode(tableLol[node.property.value]))
            }
        }
    }

    traverse(ast, renameGlobalStringVariable)

    let deobfCode = generate(ast, { comments: false }).code;
    deobfCode = beautify(deobfCode, {
        indent_size: 2,
        space_in_empty_paren: true,
    });

    // Output the deobfuscated results
    writeCodeToFile(deobfCode);

    return true
}

function writeCodeToFile(code) {
    let outputPath = "output.js";
    writeFile(outputPath, code, (err) => {
        if (err) {
            console.log("Error writing file", err);
        } else {
            console.log(`Wrote file to ${outputPath}`);
        }
    });
}

function main() {
    let ok = deobfuscate(readFileSync("./akamai175.js", 'utf-8'))
    if (ok === true) {
        console.log("Done !")
        return
    } else {
        console.log("Error....")
        return
    }
}

main()