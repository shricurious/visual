/**
 * Universal Code Storyteller
 * © 2026 [Anupam Shrivastava]
 * Built with Blockly (Apache 2.0) and Tree-sitter (MIT)
 */

/**
 * RECURSIVE TRANSFORMER (WASM-SAFE)
 * Maps Tree-sitter AST -> Blockly JSON IR using index-based navigation
 */
/**
 * RECURSIVE TRANSFORMER (WASM-SAFE)
 * Maps Tree-sitter AST nodes to Blockly JSON for Visual Storytelling
 */
function nodeToBlocklyJSON(node) {
    if (!node) return null;

    let block = {
        "id": Math.random().toString(36).substr(2, 9),
        "inputs": {},
        "fields": {}
    };

    switch (node.type) {
        // TOP LEVEL & BLOCKS
        case 'program':
        case 'module':           // Python/Go
        case 'translation_unit': // C++
        case 'statement_block':
        case 'compound_statement':
            const validChildren = node.namedChildren.filter(c => !['{', '}', ':'].includes(c.type));
            return buildBlockChain(validChildren);

        // FUNCTIONS & MODULES
        case 'function_declaration':
        case 'function_definition':
        case 'method_declaration':
            block.type = "procedures_defnoreturn";
            
            // 1. Extract Name & Parameters
            const funcName = node.namedChild(0)?.text || "unnamed";
            const paramsNode = node.namedChildren.find(c => c.type.includes('parameters'));
            const paramsText = paramsNode ? paramsNode.text : "()";
            
            // 2. Count "Steps" for the Story
            const bodyNode = node.namedChild(node.namedChildCount - 1);
            const stepCount = bodyNode.namedChildren.filter(c => !['{', '}', ':'].includes(c.type)).length;
            
            block.fields.NAME = `FUNCTION ${funcName}${paramsText} [${stepCount} steps]`;
            block.inputs.STACK = { "block": nodeToBlocklyJSON(bodyNode) };
            block.collapsed = true; // High-level "Gist" view
            break;

        // LOGIC FLOW
        case 'if_statement':
        case 'if_expression':
            block.type = "controls_if";
            // Index 0 is the condition, Index 1 is the 'then' block
            const condText = node.namedChild(0)?.text || "condition";
            block.inputs.IF0 = { "block": { "type": "text", "fields": { "TEXT": condText } } };
            block.inputs.DO0 = { "block": nodeToBlocklyJSON(node.namedChild(1)) };
            break;

        // DATA & VARIABLES
        case 'lexical_declaration':
        case 'variable_declaration':
        case 'expression_statement':
            // Recursive drill-down to the core assignment or call
            return nodeToBlocklyJSON(node.namedChild(0));

        case 'variable_declarator':
        case 'assignment_expression':
            block.type = "variables_set";
            block.fields.VAR = node.namedChild(0)?.text || "var";
            block.inputs.VALUE = { "block": { "type": "text", "fields": { "TEXT": node.namedChild(1)?.text || "null" } } };
            break;

        // ACTIONS & OUTPUTS
        case 'call_expression':
            block.type = "text_print";
            block.inputs.TEXT = { "block": { "type": "text", "fields": { "TEXT": node.text } } };
            break;

        case 'return_statement':
            block.type = "return_block";
            const retVal = node.namedChild(0)?.text || "";
            block.inputs.VALUE = { "block": { "type": "text", "fields": { "TEXT": retVal } } };
            break;

        // FALLBACK
        default:
            block.type = "text_print";
            block.inputs.TEXT = { "block": { "type": "text", "fields": { "TEXT": node.text.substring(0, 50) } } };
    }
    return block;
}

function buildBlockChain(nodes) {
    if (!nodes || nodes.length === 0) return null;
    let head = nodeToBlocklyJSON(nodes[0]);
    let current = head;
    for (let i = 1; i < nodes.length; i++) {
        let next = nodeToBlocklyJSON(nodes[i]);
        if (current && next) {
            current.next = { "block": next };
            current = next;
        }
    }
    return head; head;
}

/**
 * RECURSIVE PSEUDOCODE GENERATOR
 */
function nodeToPseudocode(node, depth = 0) {
    if (!node) return "";
    const pad = "  ".repeat(depth);

    switch (node.type) {
        case 'program':
            return node.namedChildren
                .map(c => nodeToPseudocode(c, depth))
                .join("\n");

        case 'function_declaration':
            const name = node.namedChild(0)?.text || "anonymous";
            const body = node.namedChild(node.namedChildCount - 1);
            return `${pad}DEFINE MODULE ${name}:\n${nodeToPseudocode(body, depth + 1)}\n${pad}END MODULE`;

        case 'statement_block':
            return node.namedChildren
                .filter(c => !['{', '}'].includes(c.type))
                .map(c => nodeToPseudocode(c, depth))
                .join("\n");

        case 'if_statement':
            const cond = node.namedChild(0)?.text || "condition";
            const thenPart = node.namedChild(1);
            let res = `${pad}IF ${cond} THEN\n${nodeToPseudocode(thenPart, depth + 1)}`;
            if (node.namedChildCount > 2) {
                res += `\n${pad}ELSE\n${nodeToPseudocode(node.namedChild(2), depth + 1)}`;
            }
            return res + `\n${pad}END IF`;

        case 'lexical_declaration':
        case 'variable_declaration':
        case 'expression_statement':
            return nodeToPseudocode(node.namedChild(0), depth);

        case 'variable_declarator':
        case 'assignment_expression':
            const vName = node.namedChild(0)?.text || "var";
            const vVal = node.namedChild(1)?.text || "null";
            return `${pad}SET ${vName} TO ${vVal}`;

        case 'return_statement':
            return `${pad}RETURN ${node.namedChild(0)?.text || ""}`;

        default:
            return `${pad}EXECUTE: ${node.text}`;
    }
}